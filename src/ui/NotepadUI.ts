import { publicUrl } from '../utils/publicUrl';
import { CAMPAIGN } from '../data/loader';
import type { AudioManager } from '../game/AudioManager';
import type { TransmissionDef } from '../types/campaign';

export class NotepadUI {
  private container!: HTMLDivElement;
  private scrollSheet!: HTMLDivElement;
  private logContainer!: HTMLDivElement;
  private header!: HTMLDivElement;
  private statusHost!: HTMLDivElement;
  private toggle!: HTMLButtonElement;
  private currentDay = 1;
  /** Earliest time handwriting SFX may play (coalesces burst logs into one hit). */
  private handwritingHoldUntil = 0;
  private handwritingTimer: ReturnType<typeof setTimeout> | null = null;

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
      `[${transmission.frequency} MHz] ${transmission.sender}: ${transmission.message}`,
      `Reply: ${replyText}`,
    ];
    for (const outcome of outcomes) {
      lines.push(`→ ${outcome}`);
    }
    this.addLog(lines.join('\n'), 'response');
  }

  addLog(message: string, type = 'info'): void {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const stamp = document.createElement('div');
    stamp.className = 'timestamp';
    stamp.textContent = this.formatStamp();

    const body = document.createElement('div');
    body.className = 'log-entry-body';
    body.textContent = message;

    entry.append(stamp, body);
    this.logContainer.appendChild(entry);
    this.scrollSheet.scrollTop = this.scrollSheet.scrollHeight;
    this.playHandwriting();
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
    this.logContainer.innerHTML = '';
  }

  /** Mount point for persistent supplies / trust above the log. */
  get statusMount(): HTMLElement {
    return this.statusHost;
  }

  get el(): HTMLElement {
    return this.container;
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
    this.container.setAttribute('aria-label', 'Field notes');

    this.scrollSheet = document.createElement('div');
    this.scrollSheet.className = 'notepad-scroll';
    // Keep texture on the sheet (not #game-ui) so Dev Mode layout reset can't wipe it.
    this.scrollSheet.style.setProperty(
      '--notepad-texture',
      `url("${publicUrl('images/notebook_texture.png')}")`
    );

    this.header = document.createElement('div');
    this.header.className = 'notepad-header';
    this.header.textContent = 'Field notes';

    this.statusHost = document.createElement('div');
    this.statusHost.className = 'notepad-status';

    this.logContainer = document.createElement('div');
    this.logContainer.className = 'log-container';

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

    this.scrollSheet.append(this.header, this.statusHost, this.logContainer);
    this.container.append(this.scrollSheet, this.toggle);
    document.body.appendChild(this.container);
  }

  private toggleCollapsed(): void {
    const collapsed = this.container.classList.toggle('collapsed');
    this.toggle.setAttribute('aria-label', collapsed ? 'Open notes' : 'Collapse notes');
    this.toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if (!collapsed && this.audio) {
      void this.audio.unlock().then(() => {
        this.audio?.play('notepadPull', 0.95);
      });
    }
  }
}
