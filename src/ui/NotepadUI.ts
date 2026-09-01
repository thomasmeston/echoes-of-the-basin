import { notebookTextureUrl } from '../utils/publicUrl';
import { CAMPAIGN, getClueDef } from '../data/loader';
import { formatAcpSlip } from '../game/acpSlip';
import type { AudioManager } from '../game/AudioManager';
import type { TransmissionDef } from '../types/campaign';

export interface NotepadLogEntry {
  message: string;
  type: string;
  stamp: string;
  journalTitle?: string;
  journalBody?: string;
}

type NotepadPage = 'notes' | 'supplies' | 'trust' | 'clues';

export class NotepadUI {
  private container!: HTMLDivElement;
  private scrollSheet!: HTMLDivElement;
  private logContainer!: HTMLDivElement;
  private header!: HTMLDivElement;
  private suppliesHost!: HTMLDivElement;
  private trustHost!: HTMLDivElement;
  private cluesHost!: HTMLDivElement;
  private notesPage!: HTMLDivElement;
  private pageEls = new Map<NotepadPage, HTMLElement>();
  private tabEls = new Map<NotepadPage, HTMLButtonElement>();
  private activePage: NotepadPage = 'notes';
  private toggle!: HTMLButtonElement;
  private addBtn!: HTMLButtonElement;
  private composer!: HTMLDivElement;
  private composerInput!: HTMLTextAreaElement;
  private saveBtn!: HTMLButtonElement;
  private currentDay = 1;
  /** Earliest time handwriting SFX may play (coalesces burst logs into one hit). */
  private handwritingHoldUntil = 0;
  private handwritingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEntry: NotepadLogEntry | null = null;
  private lastEntryEl: HTMLElement | null = null;
  onLog: ((entry: NotepadLogEntry) => void) | null = null;
  onManualSave: (() => void) | null = null;

  constructor(private readonly audio?: AudioManager) {
    this.build();
  }

  setDay(day: number): void {
    this.currentDay = Math.max(1, day);
  }

  /**
   * Hold handwriting SFX until `delayMs` from now.
   * Multiple addLog calls in that window share one play.
   */
  holdHandwriting(delayMs: number): void {
    this.handwritingHoldUntil = Math.max(
      this.handwritingHoldUntil,
      performance.now() + Math.max(0, delayMs)
    );
  }

  /** Record a radio exchange only after the player picks a reply. */
  recordReply(
    transmission: TransmissionDef,
    replyText: string,
    outcomes: string[]
  ): void {
    const lines = [
      formatAcpSlip(transmission),
      `[${transmission.frequency} MHz]`,
      `Reply: ${replyText}`,
    ];
    for (const outcome of outcomes) {
      lines.push(`→ ${outcome}`);
    }
    this.addLog(lines.join('\n'), 'response');
  }

  recordSlip(transmission: TransmissionDef): void {
    this.addLog(
      `${formatAcpSlip(transmission)}\n[${transmission.frequency} MHz] — copied`,
      'response'
    );
  }

  recordClue(clueId: string): void {
    const def = getClueDef(clueId);
    this.addLog(`${def.title}\n${def.body}`, 'clue');
  }

  setClues(ids: string[]): void {
    this.cluesHost.replaceChildren();
    if (ids.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'clues-empty';
      empty.textContent = 'No pages yet. Traffic and the river will fill this book.';
      this.cluesHost.appendChild(empty);
      return;
    }
    for (const id of ids) {
      const def = getClueDef(id);
      const card = document.createElement('article');
      card.className = 'clue-card';
      const title = document.createElement('h3');
      title.className = 'clue-card-title';
      title.textContent = def.title;
      const body = document.createElement('p');
      body.className = 'clue-card-body';
      body.textContent = def.body;
      card.append(title, body);
      this.cluesHost.appendChild(card);
    }
  }

  /** Append a journal scrap to the most recent note (same timestamp block). */
  attachJournalToLast(title: string, body: string): boolean {
    if (!this.lastEntry || !this.lastEntryEl) {
      return false;
    }
    if (this.lastEntry.journalTitle) {
      this.lastEntry.journalBody = [this.lastEntry.journalBody, title, body]
        .filter(Boolean)
        .join('\n\n');
    } else {
      this.lastEntry.journalTitle = title;
      this.lastEntry.journalBody = body;
    }
    this.renderJournal(this.lastEntryEl, this.lastEntry);
    return true;
  }

  addLog(message: string, type = 'info'): void {
    const entry: NotepadLogEntry = {
      message,
      type,
      stamp: this.formatStamp(),
    };
    this.mountEntry(entry);
    this.playHandwriting();
    this.onLog?.(entry);
  }

  restoreEntries(entries: NotepadLogEntry[]): void {
    this.logContainer.replaceChildren();
    this.lastEntry = null;
    this.lastEntryEl = null;
    for (const entry of entries) {
      if (entry.type === 'thought' || entry.message.startsWith('Thought: ')) {
        continue;
      }
      this.mountEntry(entry);
    }
  }

  isComposing(): boolean {
    return this.container.classList.contains('is-composing');
  }

  cancelCompose(): void {
    this.closeComposer();
  }

  private playHandwriting(): void {
    if (!this.audio) {
      return;
    }
    const wait = Math.max(0, this.handwritingHoldUntil - performance.now());
    if (this.handwritingTimer !== null) {
      clearTimeout(this.handwritingTimer);
    }
    this.handwritingTimer = setTimeout(() => {
      this.handwritingTimer = null;
      this.handwritingHoldUntil = 0;
      void this.audio?.unlock().then(() => {
        this.audio?.play('handwriting', 0.72);
      });
    }, wait);
  }

  clear(): void {
    this.closeComposer();
    this.logContainer.innerHTML = '';
    this.lastEntry = null;
    this.lastEntryEl = null;
    this.showPage('notes', { silent: true });
  }

  get suppliesMount(): HTMLElement {
    return this.suppliesHost;
  }

  get trustMount(): HTMLElement {
    return this.trustHost;
  }

  get el(): HTMLElement {
    return this.container;
  }

  private mountEntry(entry: NotepadLogEntry): void {
    const el = document.createElement('div');
    el.className = `log-entry ${entry.type}`;

    const foldable = entry.type === 'response';
    const stamp = document.createElement(foldable ? 'button' : 'div');
    stamp.className = 'timestamp';
    stamp.textContent = entry.stamp;

    const body = document.createElement('div');
    body.className = foldable ? 'log-entry-body log-entry-log' : 'log-entry-body';
    body.textContent = entry.message;

    if (foldable) {
      const btn = stamp as HTMLButtonElement;
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', `Unfold log for ${entry.stamp}`);
      body.hidden = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = el.classList.toggle('is-expanded');
        body.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute(
          'aria-label',
          open ? `Fold log for ${entry.stamp}` : `Unfold log for ${entry.stamp}`
        );
      });
    }

    el.append(stamp, body);
    this.renderJournal(el, entry);
    this.logContainer.appendChild(el);
    this.lastEntry = entry;
    this.lastEntryEl = el;
    if (this.activePage === 'notes') {
      this.scrollSheet.scrollTop = this.scrollSheet.scrollHeight;
    }
  }

  private renderJournal(el: HTMLElement, entry: NotepadLogEntry): void {
    let slot = el.querySelector<HTMLElement>('.log-entry-journal');
    if (!entry.journalTitle && !entry.journalBody) {
      slot?.remove();
      return;
    }
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'log-entry-journal';
      el.appendChild(slot);
    }
    slot.replaceChildren();
    if (entry.journalTitle) {
      const title = document.createElement('div');
      title.className = 'log-entry-journal-title';
      title.textContent = entry.journalTitle;
      slot.appendChild(title);
    }
    if (entry.journalBody) {
      const body = document.createElement('div');
      body.className = 'log-entry-journal-body';
      body.textContent = entry.journalBody;
      slot.appendChild(body);
    }
  }

  private formatStamp(): string {
    const date = new Date(CAMPAIGN.startDate);
    date.setDate(date.getDate() + (this.currentDay - 1));
    const datePart = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const now = new Date();
    const timePart = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Night ${this.currentDay} · ${datePart} · ${timePart}`;
  }

  private build(): void {
    this.container = document.createElement('div');
    this.container.id = 'game-ui';
    this.container.className = 'game-ui visible';
    this.container.dataset.devObject = 'field-notes';
    this.container.setAttribute('aria-label', 'Field Notes');

    this.scrollSheet = document.createElement('div');
    this.scrollSheet.className = 'notepad-scroll';
    // Keep texture on the sheet (not #game-ui) so Dev Mode layout reset can't wipe it.
    this.scrollSheet.style.setProperty(
      '--notepad-texture',
      `url("${notebookTextureUrl()}")`
    );
    this.scrollSheet.style.backgroundImage = `url("${notebookTextureUrl()}")`;

    this.header = document.createElement('div');
    this.header.className = 'notepad-header';
    this.header.append(
      this.makeTab('notes', 'Field Notes'),
      this.makeSep(),
      this.makeTab('supplies', 'Supplies'),
      this.makeSep(),
      this.makeTab('trust', 'Trust'),
      this.makeSep(),
      this.makeTab('clues', 'Clues')
    );

    this.logContainer = document.createElement('div');
    this.logContainer.className = 'log-container';

    this.addBtn = document.createElement('button');
    this.addBtn.type = 'button';
    this.addBtn.className = 'notepad-add-note';
    this.addBtn.textContent = '+ Add note';
    this.addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openComposer();
    });

    this.composer = document.createElement('div');
    this.composer.className = 'notepad-composer';

    this.composerInput = document.createElement('textarea');
    this.composerInput.className = 'notepad-composer-input';
    this.composerInput.rows = 3;
    this.composerInput.maxLength = 2000;
    this.composerInput.setAttribute('aria-label', 'Field note');
    this.composerInput.placeholder = 'Write a note…';
    this.composerInput.addEventListener('input', () => this.syncSaveEnabled());
    this.composerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeComposer();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.commitComposer();
      }
    });

    this.saveBtn = document.createElement('button');
    this.saveBtn.type = 'button';
    this.saveBtn.className = 'notepad-composer-save';
    this.saveBtn.textContent = 'Save';
    this.saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commitComposer();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'notepad-composer-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeComposer();
    });

    const actions = document.createElement('div');
    actions.className = 'notepad-composer-actions';
    actions.append(this.saveBtn, cancelBtn);
    this.composer.append(this.composerInput, actions);

    const composeDock = document.createElement('div');
    composeDock.className = 'notepad-compose';
    composeDock.append(this.addBtn, this.composer);

    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'notepad-toggle';
    this.toggle.setAttribute('aria-label', 'Collapse notes');
    this.toggle.setAttribute('aria-expanded', 'true');
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapsed();
    });

    // Collapsed peek is a thin strip — clicking anywhere on it opens the drawer.
    this.container.addEventListener('click', () => {
      if (this.container.classList.contains('collapsed')) {
        this.toggleCollapsed();
      }
    });

    this.notesPage = document.createElement('div');
    this.notesPage.className = 'notepad-page is-active';
    this.notesPage.dataset.page = 'notes';
    this.notesPage.append(this.logContainer, composeDock);

    this.suppliesHost = document.createElement('div');
    this.suppliesHost.className = 'notepad-page-body';
    const suppliesPage = document.createElement('div');
    suppliesPage.className = 'notepad-page';
    suppliesPage.dataset.page = 'supplies';
    suppliesPage.appendChild(this.suppliesHost);

    this.trustHost = document.createElement('div');
    this.trustHost.className = 'notepad-page-body';
    const trustPage = document.createElement('div');
    trustPage.className = 'notepad-page';
    trustPage.dataset.page = 'trust';
    trustPage.appendChild(this.trustHost);

    this.cluesHost = document.createElement('div');
    this.cluesHost.className = 'notepad-page-body clues-list';
    const cluesPage = document.createElement('div');
    cluesPage.className = 'notepad-page';
    cluesPage.dataset.page = 'clues';
    cluesPage.appendChild(this.cluesHost);

    this.pageEls.set('notes', this.notesPage);
    this.pageEls.set('supplies', suppliesPage);
    this.pageEls.set('trust', trustPage);
    this.pageEls.set('clues', cluesPage);

    this.scrollSheet.append(this.header, this.notesPage, suppliesPage, trustPage, cluesPage);
    this.setClues([]);
    this.container.append(this.scrollSheet, this.toggle);
    this.scrollSheet.addEventListener('animationend', () => {
      this.scrollSheet.classList.remove('is-page-turn');
    });
    document.body.appendChild(this.container);
    this.syncSaveEnabled();
    this.showPage('notes', { silent: true });
  }

  private makeTab(page: NotepadPage, label: string): HTMLButtonElement {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'notepad-tab';
    tab.dataset.page = page;
    tab.textContent = label;
    tab.setAttribute('aria-label', label);
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showPage(page);
    });
    this.tabEls.set(page, tab);
    return tab;
  }

  private makeSep(): HTMLSpanElement {
    const sep = document.createElement('span');
    sep.className = 'notepad-tab-sep';
    sep.textContent = '\u00a0\u00a0-\u00a0\u00a0';
    sep.setAttribute('aria-hidden', 'true');
    return sep;
  }

  private showPage(page: NotepadPage, opts: { silent?: boolean } = {}): void {
    if (this.container.classList.contains('collapsed') && !opts.silent) {
      return;
    }
    const changed = this.activePage !== page;
    if (page !== 'notes') {
      this.closeComposer();
    }
    this.activePage = page;
    this.container.dataset.page = page;
    for (const [id, el] of this.pageEls) {
      el.classList.toggle('is-active', id === page);
    }
    for (const [id, tab] of this.tabEls) {
      const on = id === page;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-current', on ? 'page' : 'false');
    }
    if (!opts.silent && changed && this.audio) {
      this.scrollSheet.classList.remove('is-page-turn');
      void this.scrollSheet.offsetWidth;
      this.scrollSheet.classList.add('is-page-turn');
      void this.audio.unlock().then(() => {
        this.audio?.play('paperUnfold', 0.7);
      });
    }
    if (page === 'notes') {
      this.scrollSheet.scrollTop = this.scrollSheet.scrollHeight;
    } else {
      this.scrollSheet.scrollTop = 0;
    }
  }

  private openComposer(): void {
    if (this.container.classList.contains('collapsed')) {
      return;
    }
    this.container.classList.add('is-composing');
    this.composerInput.value = '';
    this.syncSaveEnabled();
    this.scrollSheet.scrollTop = this.scrollSheet.scrollHeight;
    this.composerInput.focus();
  }

  private closeComposer(): void {
    this.container.classList.remove('is-composing');
    this.composerInput.value = '';
    this.syncSaveEnabled();
  }

  private commitComposer(): void {
    const text = this.composerInput.value.trim();
    if (!text) {
      return;
    }
    this.addLog(text, 'note');
    this.closeComposer();
    this.onManualSave?.();
  }

  private syncSaveEnabled(): void {
    this.saveBtn.disabled = this.composerInput.value.trim().length === 0;
  }

  private toggleCollapsed(): void {
    const collapsed = this.container.classList.toggle('collapsed');
    this.toggle.setAttribute('aria-label', collapsed ? 'Open notes' : 'Collapse notes');
    this.toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if (collapsed) {
      this.closeComposer();
    }
    if (!collapsed && this.audio) {
      void this.audio.unlock().then(() => {
        this.audio?.play('notepadPull', 0.95);
      });
    }
  }
}
