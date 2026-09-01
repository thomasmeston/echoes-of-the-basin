import { CAMPAIGN, getMapLandmark } from '../data/loader';
import { GameState } from './GameState';
import { CampaignManager } from './CampaignManager';
import { NarrativeManager } from './NarrativeManager';
import { SaveLoad } from './SaveLoad';
import { AudioManager } from './AudioManager';
import { resolveEnding } from './EndingResolver';
import { RadioUI } from '../ui/RadioUI';
import { NotepadUI } from '../ui/NotepadUI';
import { CalendarUI } from '../ui/CalendarUI';
import { ResourceUI } from '../ui/ResourceUI';
import { WatchClockUI } from '../ui/WatchClockUI';
import { PauseMenu } from '../ui/PauseMenu';
import { DevPanel } from '../ui/DevPanel';
import { MapOverlay, type MapDiscoverResult } from '../ui/MapOverlay';
import { PapersOverlay } from '../ui/PapersOverlay';
import { OpsManualOverlay } from '../ui/OpsManualOverlay';
import { SchedLogOverlay } from '../ui/SchedLogOverlay';
import { DecodeBookOverlay } from '../ui/DecodeBookOverlay';
import { TitleMenu } from '../ui/TitleMenu';
import { IntroOverlay } from '../ui/IntroOverlay';
import { DeskStage } from '../scene/DeskStage';
import { daylightFromWatchMinutes } from '../scene/WindowView';
import type { TransmissionDef } from '../types/campaign';
import {
  GAME_MINUTES_PER_REAL_SECOND,
  REPLY_HANDWRITING_DELAY_MS,
  TOTAL_DAYS,
} from '../utils/constants';

export class Game {
  readonly state = new GameState();
  readonly campaign = new CampaignManager(this.state);
  readonly narrative = new NarrativeManager(this.state);
  readonly saveLoad = new SaveLoad();
  readonly audio = new AudioManager();

  private radioUI!: RadioUI;
  private notepadUI!: NotepadUI;
  private calendarUI!: CalendarUI;
  private watchClockUI!: WatchClockUI;
  private pauseMenu!: PauseMenu;
  private devPanel!: DevPanel;
  private mapOverlay!: MapOverlay;
  private papersOverlay!: PapersOverlay;
  private opsManualOverlay!: OpsManualOverlay;
  private schedLogOverlay!: SchedLogOverlay;
  private decodeBookOverlay!: DecodeBookOverlay;
  private titleMenu!: TitleMenu;
  private introOverlay!: IntroOverlay;
  private deskStage!: DeskStage;
  private leftHud!: HTMLDivElement;
  private fadeOverlay!: HTMLDivElement;
  private dayEndPrompt!: HTMLDivElement;
  private endingOverlay!: HTMLDivElement;
  private activeTransmission: TransmissionDef | null = null;
  private gameplayActive = false;
  private watchTickId: number | null = null;
  private lastWatchTickMs = 0;

  async init(container: HTMLElement): Promise<void> {
    this.audio.init();
    const unlockAudio = () => {
      void this.audio.unlock();
      document.removeEventListener('pointerdown', unlockAudio, true);
    };
    document.addEventListener('pointerdown', unlockAudio, true);

    this.deskStage = new DeskStage(container);

    this.leftHud = document.createElement('div');
    this.leftHud.className = 'left-hud';
    document.body.appendChild(this.leftHud);

    this.radioUI = new RadioUI({
      onTune: (delta) => this.tune(delta),
      onBand: (delta) => this.tuneBand(delta),
      onMeter: (delta) => this.tuneMeter(delta),
      onPower: (delta) => this.tunePower(delta),
      onChoice: (choiceId) => this.choose(choiceId),
      onOpenDecoder: () => this.decodeBookOverlay.show(),
      onCipherSkip: () => this.failActiveTransmission(),
      onCallSign: (code) => this.submitCallSign(code),
      onCallSignRefuse: () => this.failActiveTransmission(),
      deskStage: this.deskStage,
    });
    this.notepadUI = new NotepadUI(this.audio);
    this.notepadUI.onLog = (entry) => {
      this.state.fieldNotes.push(entry);
    };
    this.notepadUI.onManualSave = () => this.autosave();
    new ResourceUI(this.state, this.notepadUI.suppliesMount, 'notes', ['supplies']);
    new ResourceUI(this.state, this.notepadUI.trustMount, 'notes', ['trust']);
    this.watchClockUI = new WatchClockUI(this.leftHud);
    this.calendarUI = new CalendarUI(new Date(CAMPAIGN.startDate), this.leftHud);
    this.deskStage.registerExternalObject('hud-clock', this.watchClockUI.el);
    this.deskStage.registerExternalObject('hud-calendar', this.calendarUI.el);
    this.deskStage.registerExternalObject('field-notes', this.notepadUI.el);
    this.mapOverlay = new MapOverlay(this.audio, {
      isDiscovered: (id) => this.state.hasDiscoveredLandmark(id),
      isHinted: (id) => this.isLandmarkHinted(id),
      canAfford: (cost) => this.state.resources.batteries >= cost,
      onDiscover: (id, tokens) => this.discoverLandmark(id, tokens),
    });
    this.papersOverlay = new PapersOverlay(this.audio);
    this.opsManualOverlay = new OpsManualOverlay(this.audio);
    this.schedLogOverlay = new SchedLogOverlay(this.audio);
    this.decodeBookOverlay = new DecodeBookOverlay(this.audio, {
      getDay: () => this.state.currentDay,
      getActiveCipher: () => this.activeTransmission?.cipher ?? null,
      getActiveDecoderDay: () =>
        this.activeTransmission?.decoderDay ?? this.state.currentDay,
      onDecoded: () => this.onCipherDecoded(),
      onWrong: () => this.failActiveTransmission(),
    });
    this.bindMapClick();
    this.bindOpsManualClick();
    this.bindSchedLogClick();
    this.bindDecodeBookClick();
    this.bindDrawerClicks();
    this.devPanel = new DevPanel(this.deskStage);
    this.pauseMenu = new PauseMenu({
      audio: this.audio,
      onResume: () => undefined,
      onNewGame: () => this.returnToTitle(),
      onSave: () => this.autosave(),
      onToggleDev: () => this.devPanel.toggle(),
    });
    this.titleMenu = new TitleMenu({
      onNewGame: (slot) => {
        void this.beginNewGame(slot);
      },
      onContinue: (slot) => {
        void this.continueGame(slot);
      },
    });
    this.introOverlay = new IntroOverlay(this.audio);
    this.fadeOverlay = this.createFadeOverlay();
    this.dayEndPrompt = this.createDayEndPrompt();
    this.endingOverlay = this.createEndingOverlay();

    this.wireStateEvents();
    this.bindEscapeMenu();
    this.bindDevMode();

    this.setGameplayVisible(false);
    this.titleMenu.show(this.saveLoad.listSlots());
  }

  private get deskInspectOpen(): boolean {
    return (
      this.mapOverlay.isOpen ||
      this.papersOverlay.isOpen ||
      this.opsManualOverlay.isOpen ||
      this.schedLogOverlay.isOpen ||
      this.decodeBookOverlay.isOpen
    );
  }

  private canAccessRadio(): boolean {
    return (
      this.gameplayActive &&
      !this.pauseMenu.isOpen &&
      !this.devPanel.isActive &&
      !this.deskInspectOpen &&
      !this.titleMenu.isOpen
    );
  }

  private canOperateRadio(): boolean {
    return this.canAccessRadio() && this.state.radioOn;
  }

  tune(delta: number): void {
    if (!this.canOperateRadio()) {
      return;
    }
    this.state.tune(delta);
    this.radioUI.setFrequency(this.state.currentFrequency);
    this.checkFrequency();
    this.autosave();
  }

  tuneBand(delta: number): void {
    if (!this.canOperateRadio()) {
      return;
    }
    const band = this.state.setBandDelta(delta);
    this.radioUI.setBand(band);
    this.audio.play('staticBlip', 0.45);
    this.autosave();
  }

  tuneMeter(delta: number): void {
    if (!this.canOperateRadio()) {
      return;
    }
    const meter = this.state.setMeterDelta(delta);
    this.radioUI.setMeter(meter);
    this.audio.play('staticBlip', 0.4);
    this.autosave();
  }

  tunePower(delta: number): void {
    if (!this.canAccessRadio()) {
      return;
    }
    // Any step toggles power (2-position dial).
    if (delta === 0) {
      return;
    }
    const on = this.state.toggleRadioPower();
    this.radioUI.setPower(on);
    this.audio.setRadioStatic(on);
    if (on) {
      this.audio.play('radioBeep', 0.7);
      this.checkFrequency();
    } else {
      this.audio.play('staticBlip', 0.35);
      this.activeTransmission = null;
      this.radioUI.hideChoices();
    }
    this.autosave();
  }

  choose(choiceId: string): void {
    if (
      !this.canOperateRadio() ||
      !this.activeTransmission
    ) {
      return;
    }
    this.audio.play('radioBeep');
    // Flag reactions also write a journal into this reply; coalesce SFX after the beep.
    this.notepadUI.holdHandwriting(REPLY_HANDWRITING_DELAY_MS);
    const transmission = this.activeTransmission;
    const choice = transmission.choices.find((c) => c.id === choiceId);
    const journalsBefore = new Set(Object.keys(this.narrative.getJournalEntries()));
    const result = this.campaign.applyChoice(transmission, choiceId);
    this.notepadUI.recordReply(
      transmission,
      choice?.text ?? choiceId,
      result.logLines
    );
    if (result.journal) {
      this.narrative.addJournal(result.journal);
    }
    if (result.thought) {
      this.narrative.showThought(result.thought);
    }
    this.attachFreshJournals(journalsBefore, true);
    this.activeTransmission = null;
    this.radioUI.hideChoices();
    this.autosave();

    if (this.state.flags.campaign_complete) {
      void this.showEnding();
      return;
    }

    if (this.campaign.isDayComplete()) {
      this.showDayEndPrompt();
    }
  }

  async sleep(): Promise<void> {
    this.dayEndPrompt.style.display = 'none';
    await this.fadeToBlack();
    this.campaign.applyDailyDrain();
    if (
      this.state.resources.food <= 0 ||
      this.state.resources.batteries <= 0 ||
      this.state.resources.medicine <= 0
    ) {
      await this.fadeFromBlack();
      return;
    }

    const close = this.narrative.showDayClose();
    if (close) {
      this.notepadUI.addLog(close, 'day');
    }

    if (this.state.currentDay >= TOTAL_DAYS) {
      await this.fadeFromBlack();
      if (!this.state.flags.campaign_complete) {
        this.state.setFlag('campaign_complete', true);
        await this.showEnding();
      }
      return;
    }

    this.state.advanceDay();
    this.campaign.loadDay(this.state.currentDay);
    this.narrative.loadDay(this.state.currentDay);
    this.calendarUI.advanceDay();
    this.notepadUI.setDay(this.state.currentDay);
    this.narrative.showOpeningIfNeeded();
    this.notepadUI.addLog(`Day ${this.state.currentDay} begins.`, 'day');
    this.autosave();
    await this.fadeFromBlack();
  }

  private async beginNewGame(slot: number): Promise<void> {
    this.titleMenu.hide();
    this.saveLoad.setActiveSlot(slot);
    this.saveLoad.clear(slot);
    this.resetRunState();
    await this.introOverlay.play();
    this.enterGameplay({ showOpening: true, autosave: true });
  }

  private async continueGame(slot: number): Promise<void> {
    this.titleMenu.hide();
    const loaded = this.saveLoad.load(this.state, this.narrative, this.campaign, slot);
    if (!loaded) {
      await this.beginNewGame(slot);
      return;
    }
    this.enterGameplay({ showOpening: false, autosave: false });
  }

  private returnToTitle(): void {
    if (this.gameplayActive) {
      this.autosave();
    }
    if (this.pauseMenu.isOpen) {
      this.pauseMenu.hide();
    }
    this.mapOverlay.hide();
    this.papersOverlay.hide();
    this.opsManualOverlay.hide();
    this.schedLogOverlay.hide();
    this.decodeBookOverlay.hide();
    this.dayEndPrompt.style.display = 'none';
    this.endingOverlay.style.display = 'none';
    this.activeTransmission = null;
    this.radioUI.hideChoices();
    this.notepadUI.clear();
    this.gameplayActive = false;
    this.stopWatchClock();
    this.audio.setRadioStatic(false);
    this.audio.setOpera(false);
    this.setGameplayVisible(false);
    this.titleMenu.show(this.saveLoad.listSlots());
  }

  private resetRunState(): void {
    this.state.resetForNewGame();
    this.narrative.loadSaveData({
      day: 1,
      journalEntries: {},
      heardThoughts: [],
      triggeredFlags: [],
      openingShown: false,
    });
    this.campaign.loadDay(1);
    this.narrative.loadDay(1);
    this.calendarUI.reset(new Date(CAMPAIGN.startDate));
    this.notepadUI.setDay(1);
    this.notepadUI.clear();
    this.radioUI.hideChoices();
    this.syncRadioControls();
    this.activeTransmission = null;
    this.endingOverlay.style.display = 'none';
    this.dayEndPrompt.style.display = 'none';
  }

  private syncRadioControls(): void {
    this.radioUI.setFrequency(this.state.currentFrequency);
    this.radioUI.setBand(this.state.band);
    this.radioUI.setMeter(this.state.meter);
    this.radioUI.setPower(this.state.radioOn);
    this.audio.setRadioStatic(this.gameplayActive && this.state.radioOn);
    this.syncRadioProgram();
  }

  private enterGameplay(opts: { showOpening: boolean; autosave: boolean }): void {
    this.campaign.loadDay(this.state.currentDay);
    this.narrative.loadDay(this.state.currentDay);
    this.calendarUI.setDay(this.state.currentDay);
    this.notepadUI.setDay(this.state.currentDay);
    this.notepadUI.restoreEntries(this.state.fieldNotes);
    this.notepadUI.setClues([...this.state.clues]);
    this.gameplayActive = true;
    this.syncRadioControls();
    this.syncWallClock();
    this.startWatchClock();
    this.setGameplayVisible(true);
    if (opts.showOpening) {
      this.narrative.showOpeningIfNeeded();
    }
    if (opts.autosave) {
      this.autosave();
    }
  }

  private setGameplayVisible(visible: boolean): void {
    document.body.classList.toggle('title-screen-active', !visible);
    this.leftHud.style.display = visible ? '' : 'none';
    const notepad = document.getElementById('game-ui');
    if (notepad) {
      notepad.style.display = visible ? '' : 'none';
    }
    const container = document.getElementById('game-container');
    if (container) {
      container.style.visibility = visible ? 'visible' : 'hidden';
    }
  }

  private syncRadioProgram(): void {
    const onAir =
      this.gameplayActive &&
      this.state.radioOn &&
      this.campaign.getRadioBed(this.state.currentFrequency) === 'opera';
    this.audio.setOpera(onAir);
  }

  private checkFrequency(): void {
    const frequency = this.state.currentFrequency;
    const transmission = this.campaign.getTransmissionAtFrequency(frequency);
    this.syncRadioProgram();

    if (!transmission) {
      this.activeTransmission = null;
      this.radioUI.hideChoices();
      return;
    }

    this.audio.play('staticBlip', 0.55);
    this.activeTransmission = transmission;
    this.presentTransmission(transmission);
  }

  private presentTransmission(transmission: TransmissionDef): void {
    if (transmission.cipher && !this.state.hasDecoded(transmission.id)) {
      this.radioUI.showCipher(transmission);
      return;
    }
    if (transmission.callSign && !this.state.hasCallSignPassed(transmission.id)) {
      this.radioUI.showCallSign(transmission, [...this.state.knownCodes]);
      return;
    }
    if (!this.state.hasSlipLogged(transmission.id)) {
      this.notepadUI.recordSlip(transmission);
      this.state.markSlipLogged(transmission.id);
    }
    this.radioUI.showChoices(transmission);
  }

  private onCipherDecoded(): void {
    const tx = this.activeTransmission;
    if (!tx?.cipher) {
      return;
    }
    this.state.markDecoded(tx.id);
    this.presentTransmission(tx);
    this.autosave();
  }

  private submitCallSign(code: string): void {
    const tx = this.activeTransmission;
    if (!tx?.callSign) {
      return;
    }
    const got = code.trim().toUpperCase();
    const want = tx.callSign.answer.trim().toUpperCase();
    if (got === want) {
      this.state.markCallSignPassed(tx.id);
      this.state.addKnownCode(want);
      this.presentTransmission(tx);
      this.autosave();
      return;
    }
    this.failActiveTransmission();
  }

  private failActiveTransmission(): void {
    const tx = this.activeTransmission;
    if (!tx || !this.canOperateRadio()) {
      return;
    }
    this.notepadUI.holdHandwriting(REPLY_HANDWRITING_DELAY_MS);
    const journalsBefore = new Set(Object.keys(this.narrative.getJournalEntries()));
    const result = this.campaign.failTransmission(tx);
    this.notepadUI.recordReply(tx, 'No copy / failed gate', result.logLines);
    this.attachFreshJournals(journalsBefore, true);
    this.activeTransmission = null;
    this.radioUI.hideChoices();
    this.autosave();
    if (this.campaign.isDayComplete()) {
      this.showDayEndPrompt();
    }
  }

  private isLandmarkHinted(landmarkId: string): boolean {
    if (this.state.hasDiscoveredLandmark(landmarkId)) {
      return false;
    }
    const found = getMapLandmark(landmarkId);
    const hint = found?.landmark.hintClue;
    return Boolean(hint && this.state.clues.has(hint));
  }

  private wireStateEvents(): void {
    this.state.events.on('gameOver', (message) => {
      this.endingOverlay.querySelector('h2')!.textContent = 'Out of supplies';
      this.endingOverlay.querySelector('p')!.textContent = message;
      this.endingOverlay.style.display = 'flex';
    });

    this.state.events.on('watchTimeChanged', () => {
      this.syncWallClock();
    });

    this.narrative.events.on('openingLog', (text) => {
      this.notepadUI.addLog(text, 'day');
    });

    this.state.events.on('clueAdded', (clueId) => {
      this.notepadUI.recordClue(clueId);
      this.notepadUI.setClues([...this.state.clues]);
      this.mapOverlay.refreshDiscoveredMarks();
    });
  }

  /** Fold new journal scraps into the latest reply (or log a standalone scrap). */
  private attachFreshJournals(before: Set<string>, ontoLast: boolean): void {
    for (const [id, entry] of Object.entries(this.narrative.getJournalEntries())) {
      if (before.has(id)) {
        continue;
      }
      if (ontoLast && this.notepadUI.attachJournalToLast(entry.title, entry.body)) {
        continue;
      }
      this.notepadUI.addLog(`${entry.title}\n${entry.body}`, 'journal');
    }
  }

  private syncWallClock(): void {
    this.watchClockUI.setFromWatchMinutes(this.state.watchMinutes);
    this.deskStage.windowView.setDaylight(daylightFromWatchMinutes(this.state.watchMinutes));
  }

  private startWatchClock(): void {
    this.stopWatchClock();
    this.lastWatchTickMs = performance.now();
    const tick = (now: number) => {
      this.watchTickId = requestAnimationFrame(tick);
      if (!this.gameplayActive || this.pauseMenu.isOpen || this.titleMenu.isOpen) {
        this.lastWatchTickMs = now;
        return;
      }
      const dt = Math.min(1, (now - this.lastWatchTickMs) / 1000);
      this.lastWatchTickMs = now;
      if (dt > 0) {
        this.state.advanceWatchMinutes(dt * GAME_MINUTES_PER_REAL_SECOND);
      }
      // Smooth minute-hand sweep (fractional watch minutes).
      this.syncWallClock();
    };
    this.watchTickId = requestAnimationFrame(tick);
  }

  private stopWatchClock(): void {
    if (this.watchTickId !== null) {
      cancelAnimationFrame(this.watchTickId);
      this.watchTickId = null;
    }
  }

  private bindEscapeMenu(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      if (this.titleMenu.isOpen) {
        return;
      }
      if (this.mapOverlay.isOpen) {
        // MapOverlay owns Escape (focus → overview → close).
        return;
      }
      if (this.papersOverlay.isOpen) {
        this.papersOverlay.hide();
        return;
      }
      if (this.opsManualOverlay.isOpen) {
        this.opsManualOverlay.hide();
        return;
      }
      if (this.schedLogOverlay.isOpen) {
        this.schedLogOverlay.hide();
        return;
      }
      if (this.decodeBookOverlay.isOpen) {
        this.decodeBookOverlay.hide();
        return;
      }
      if (this.notepadUI.isComposing()) {
        this.notepadUI.cancelCompose();
        return;
      }
      if (this.devPanel.isActive) {
        this.devPanel.hide();
        return;
      }
      if (!this.gameplayActive) {
        return;
      }
      this.pauseMenu.toggle();
    });
  }

  private bindDevMode(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key !== '`' && e.key !== 'Backquote') {
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return;
      }
      if (!this.gameplayActive || this.titleMenu.isOpen) {
        return;
      }
      e.preventDefault();
      if (this.pauseMenu.isOpen) {
        this.pauseMenu.hide();
      }
      this.devPanel.toggle();
    });
  }

  private discoverLandmark(landmarkId: string, tokens: string[]): MapDiscoverResult {
    if (this.state.hasDiscoveredLandmark(landmarkId)) {
      return { ok: false, reason: 'already' };
    }
    const costToken = tokens.find((t) => t.startsWith('resource:batteries:'));
    const cost = costToken ? Math.abs(Number(costToken.split(':')[2] ?? 0)) : 0;
    if (cost > 0 && this.state.resources.batteries < cost) {
      return { ok: false, reason: 'batteries' };
    }

    const journalsBefore = new Set(Object.keys(this.narrative.getJournalEntries()));
    const result = this.campaign.applyTokens(tokens);
    this.state.markLandmarkDiscovered(landmarkId);
    this.mapOverlay.refreshDiscoveredMarks();
    for (const line of result.logLines) {
      this.notepadUI.addLog(line, 'journal');
    }
    if (result.journal) {
      this.narrative.addJournal(result.journal);
    }
    if (result.thought) {
      this.narrative.showThought(result.thought);
    }
    this.attachFreshJournals(journalsBefore, result.logLines.length > 0);
    this.autosave();
    return { ok: true };
  }

  private bindMapClick(): void {
    this.bindDeskInspectTarget('map-folded', 'Open basin map', () => {
      this.papersOverlay.hide();
      this.opsManualOverlay.hide();
      this.schedLogOverlay.hide();
      this.decodeBookOverlay.hide();
      this.mapOverlay.show();
    });
  }

  private bindOpsManualClick(): void {
    this.bindDeskInspectTarget('ops-manual', 'Open operating instructions', () => {
      this.mapOverlay.hide();
      this.papersOverlay.hide();
      this.schedLogOverlay.hide();
      this.decodeBookOverlay.hide();
      this.opsManualOverlay.show();
    });
  }

  private bindSchedLogClick(): void {
    this.bindDeskInspectTarget('sched-log', 'Open Sched Log', () => {
      this.mapOverlay.hide();
      this.papersOverlay.hide();
      this.opsManualOverlay.hide();
      this.decodeBookOverlay.hide();
      this.schedLogOverlay.show();
    });
  }

  private bindDecodeBookClick(): void {
    this.bindDeskInspectTarget('decode-book', 'Open decode book', () => {
      this.mapOverlay.hide();
      this.papersOverlay.hide();
      this.opsManualOverlay.hide();
      this.schedLogOverlay.hide();
      this.decodeBookOverlay.show();
    });
  }

  private bindDrawerClicks(): void {
    this.bindDrawer('drawer-left', 'left', 'Open left desk drawer');
    this.bindDrawer('drawer-right', 'right', 'Open right desk drawer');
  }

  private bindDrawer(
    id: 'drawer-left' | 'drawer-right',
    side: 'left' | 'right',
    title: string
  ): void {
    const el = this.deskStage.getObjectElement(id);
    if (!el) {
      return;
    }
    el.title = title;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const toggle = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.gameplayActive || this.pauseMenu.isOpen || this.devPanel.isActive) {
        return;
      }
      const open = this.deskStage.toggleDrawer(side);
      this.audio.play(open ? 'drawerOpen' : 'drawerClose', 0.9);
      el.title = open
        ? `Close ${side} desk drawer`
        : `Open ${side} desk drawer`;
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggle(e);
      }
    });
  }

  private bindDeskInspectTarget(
    id: 'map-folded' | 'papers' | 'ops-manual' | 'sched-log' | 'decode-book',
    title: string,
    openFn: () => void
  ): void {
    const el = this.deskStage.getObjectElement(id);
    if (!el) {
      return;
    }
    el.classList.add('desk-inspect-hit');
    el.title = title;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const open = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.gameplayActive || this.pauseMenu.isOpen || this.devPanel.isActive) {
        return;
      }
      openFn();
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        open(e);
      }
    });
  }

  private showDayEndPrompt(): void {
    this.dayEndPrompt.style.display = 'flex';
  }

  private async showEnding(): Promise<void> {
    this.state.campaignComplete = true;
    const ending = resolveEnding(this.state);
    this.endingOverlay.querySelector('h2')!.textContent = ending.title;
    this.endingOverlay.querySelector('p')!.textContent = ending.body;
    this.endingOverlay.style.display = 'flex';
    this.autosave();
  }

  private autosave(): void {
    if (!this.gameplayActive) {
      return;
    }
    this.saveLoad.save(this.state, this.narrative, this.campaign);
  }

  private createFadeOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'fade-overlay';
    document.body.appendChild(overlay);
    return overlay;
  }

  private createDayEndPrompt(): HTMLDivElement {
    const prompt = document.createElement('div');
    prompt.className = 'day-end-prompt';
    prompt.style.display = 'none';
    prompt.innerHTML = `
      <div class="prompt-content">
        <p>Night has fallen. Required beats logged. Go to sleep?</p>
        <div class="prompt-buttons">
          <button class="prompt-button yes-button" type="button">Yes</button>
          <button class="prompt-button no-button" type="button">No</button>
        </div>
      </div>
    `;
    prompt.querySelector('.yes-button')?.addEventListener('click', () => {
      void this.sleep();
    });
    prompt.querySelector('.no-button')?.addEventListener('click', () => {
      prompt.style.display = 'none';
    });
    document.body.appendChild(prompt);
    return prompt;
  }

  private createEndingOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'day-end-prompt';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="prompt-content ending-content">
        <h2>Ending</h2>
        <p></p>
        <div class="prompt-buttons">
          <button class="prompt-button yes-button" type="button">Title menu</button>
        </div>
      </div>
    `;
    overlay.querySelector('.yes-button')?.addEventListener('click', () => {
      overlay.style.display = 'none';
      this.returnToTitle();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  private fadeToBlack(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeOverlay.classList.add('fade-in');
      window.setTimeout(resolve, 1200);
    });
  }

  private fadeFromBlack(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeOverlay.classList.remove('fade-in');
      window.setTimeout(resolve, 800);
    });
  }
}
