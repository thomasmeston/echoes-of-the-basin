import type { TransmissionDef } from '../types/campaign';
import type { DeskStage } from '../scene/DeskStage';
import { CAMPAIGN } from '../data/loader';
import { formatAcpSlip } from '../game/acpSlip';
import { BAND_COUNT, METER_SETTINGS, type MeterSetting } from '../utils/constants';

export interface RadioUIOptions {
  onTune: (delta: number) => void;
  onBand: (delta: number) => void;
  onMeter: (delta: number) => void;
  onPower: (delta: number) => void;
  onChoice: (choiceId: string) => void;
  onOpenDecoder?: () => void;
  onCipherSkip?: () => void;
  onCallSign?: (code: string) => void;
  onCallSignRefuse?: () => void;
  deskStage: DeskStage;
}

export class RadioUI {
  private frequencyEl!: HTMLElement;
  private choicesBox!: HTMLDivElement;
  private infoBox!: HTMLDivElement;
  private choicesContainer!: HTMLDivElement;
  private currentIndex = 0;

  constructor(private readonly options: RadioUIOptions) {
    this.build();
    this.options.deskStage.setFrequencyCount(CAMPAIGN.frequencies.length);
  }

  setFrequency(mhz: number): void {
    this.frequencyEl.textContent = `${mhz} MHz`;
    const index = CAMPAIGN.frequencies.indexOf(mhz);
    this.currentIndex = index >= 0 ? index : 0;
    this.options.deskStage.setDialIndex(this.currentIndex);
  }

  setBand(band: number): void {
    const idx = Math.min(BAND_COUNT, Math.max(1, band)) - 1;
    this.options.deskStage.setBandIndex(idx);
  }

  setMeter(meter: MeterSetting): void {
    const idx = METER_SETTINGS.indexOf(meter);
    this.options.deskStage.setMeterIndex(idx >= 0 ? idx : 0);
  }

  setPower(on: boolean): void {
    this.options.deskStage.setPowerOn(on);
    this.frequencyEl.classList.toggle('frequency-display--off', !on);
  }

  twitchMeters(): void {
    this.options.deskStage.twitchMeters();
  }

  showChoices(transmission: TransmissionDef): void {
    this.infoBox.innerHTML = `
      <div class="sender">${transmission.originator ?? transmission.sender}</div>
      <div class="message acp-slip">${escapeHtml(formatAcpSlip(transmission))}</div>
    `;
    this.infoBox.style.display = 'block';
    this.choicesContainer.innerHTML = '';
    for (const choice of transmission.choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = choice.text;
      button.addEventListener('click', () => this.options.onChoice(choice.id));
      this.choicesContainer.appendChild(button);
    }
    this.choicesBox.style.display = 'block';
    this.options.deskStage.setMetersLive(true);
  }

  showCipher(transmission: TransmissionDef): void {
    this.infoBox.innerHTML = `
      <div class="sender">${transmission.originator ?? transmission.sender}</div>
      <div class="message acp-slip">PREC ${transmission.precedence ?? 'PRIORITY'}
FROM ${transmission.originator ?? transmission.sender}
TO ${transmission.addressee ?? 'TANGO-SEVEN'}
CIPHER ${transmission.cipher}</div>
    `;
    this.infoBox.style.display = 'block';
    this.choicesContainer.innerHTML = '';
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'choice-button';
    openBtn.textContent = 'Open decode book';
    openBtn.addEventListener('click', () => this.options.onOpenDecoder?.());
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'choice-button';
    skip.textContent = 'Give up — lost in static';
    skip.addEventListener('click', () => this.options.onCipherSkip?.());
    this.choicesContainer.append(openBtn, skip);
    this.choicesBox.style.display = 'block';
    this.options.deskStage.setMetersLive(true);
  }

  showCallSign(transmission: TransmissionDef, knownCodes: string[]): void {
    const gate = transmission.callSign!;
    this.infoBox.innerHTML = `
      <div class="sender">${transmission.originator ?? transmission.sender}</div>
      <div class="message">${escapeHtml(gate.challenge)}</div>
    `;
    this.infoBox.style.display = 'block';
    this.choicesContainer.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'callsign-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'callsign-input';
    input.autocomplete = 'off';
    input.placeholder = 'Code word';
    input.setAttribute('aria-label', 'Call-sign code word');
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'choice-button';
    send.textContent = 'Confirm';
    const submit = () => this.options.onCallSign?.(input.value);
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    row.append(input, send);
    this.choicesContainer.appendChild(row);
    for (const code of knownCodes) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'choice-button callsign-chip';
      chip.textContent = code;
      chip.addEventListener('click', () => this.options.onCallSign?.(code));
      this.choicesContainer.appendChild(chip);
    }
    const refuse = document.createElement('button');
    refuse.type = 'button';
    refuse.className = 'choice-button';
    refuse.textContent = 'Refuse — no copy';
    refuse.addEventListener('click', () => this.options.onCallSignRefuse?.());
    this.choicesContainer.appendChild(refuse);
    this.choicesBox.style.display = 'block';
    this.options.deskStage.setMetersLive(true);
    input.focus();
  }

  hideChoices(): void {
    this.choicesBox.style.display = 'none';
    this.infoBox.style.display = 'none';
    this.options.deskStage.setMetersLive(false);
  }

  private build(): void {
    const cluster = this.options.deskStage.radioCluster;

    const overlay = document.createElement('div');
    overlay.className = 'radio-overlay';
    overlay.dataset.devObject = 'radio-overlay';

    const display = document.createElement('div');
    display.className = 'frequency-display';
    display.id = 'current-frequency';
    display.dataset.devObject = 'freq-display';
    display.textContent = '88.5 MHz';

    // Overlay + readout are absolute cluster children so Dev Mode % coords share one box.
    // Tuning is dial-only (no ◀/▶ buttons).
    cluster.appendChild(overlay);
    cluster.appendChild(display);

    this.frequencyEl = display;
    this.setupSteppedDial(this.options.deskStage.getDialHitTarget(), {
      title: 'Click or drag to tune',
      onStep: (delta) => this.options.onTune(delta),
      dragThreshold: 0.35,
    });
    this.setupSteppedDial(this.options.deskStage.getBandHitTarget(), {
      title: 'Band',
      onStep: (delta) => this.options.onBand(delta),
      dragThreshold: 0.45,
    });
    this.setupSteppedDial(this.options.deskStage.getMeterHitTarget(), {
      title: 'Meter',
      onStep: (delta) => this.options.onMeter(delta),
      dragThreshold: 0.55,
    });
    this.setupSteppedDial(this.options.deskStage.getPowerHitTarget(), {
      title: 'Power',
      onStep: (delta) => this.options.onPower(delta),
      dragThreshold: 0.5,
    });

    this.infoBox = document.createElement('div');
    this.infoBox.className = 'transmission-info radio-message-bubble';
    this.infoBox.style.display = 'none';
    this.infoBox.innerHTML = `
      <div class="sender">Incoming</div>
      <div class="message">Transmission preview</div>
    `;

    this.choicesContainer = document.createElement('div');
    this.choicesContainer.className = 'choices-container';
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'choice-button';
    preview.textContent = 'Reply preview';
    this.choicesContainer.appendChild(preview);

    this.choicesBox = document.createElement('div');
    this.choicesBox.className = 'response-box radio-reply-bubble';
    this.choicesBox.style.display = 'none';
    this.choicesBox.appendChild(this.choicesContainer);

    cluster.appendChild(this.infoBox);
    cluster.appendChild(this.choicesBox);
    this.options.deskStage.registerExternalObject('radio-message', this.infoBox);
    this.options.deskStage.registerExternalObject('radio-reply', this.choicesBox);
  }

  private setupSteppedDial(
    dial: HTMLElement,
    opts: {
      title: string;
      onStep: (delta: number) => void;
      dragThreshold: number;
    }
  ): void {
    dial.classList.add('desk-dial-hit');
    dial.title = opts.title;

    let dragging = false;
    let didDragTune = false;
    let lastAngle = 0;

    const angleAt = (e: PointerEvent): number => {
      const rect = dial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(e.clientY - cy, e.clientX - cx);
    };

    dial.addEventListener('pointerdown', (e) => {
      if (document.body.classList.contains('dev-mode-active')) {
        return;
      }
      e.stopPropagation();
      dragging = true;
      didDragTune = false;
      lastAngle = angleAt(e);
      dial.setPointerCapture(e.pointerId);
    });

    dial.addEventListener('pointermove', (e) => {
      if (!dragging) {
        return;
      }
      const angle = angleAt(e);
      let delta = angle - lastAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) > opts.dragThreshold) {
        didDragTune = true;
        opts.onStep(delta > 0 ? 1 : -1);
        lastAngle = angle;
      }
    });

    const end = (e: PointerEvent) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      try {
        dial.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      // Click (no drag step) → next detent
      if (!didDragTune && e.type === 'pointerup') {
        opts.onStep(1);
      }
    };
    dial.addEventListener('pointerup', end);
    dial.addEventListener('pointercancel', end);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
