import type { TransmissionDef } from '../types/campaign';

export function formatAcpSlip(transmission: TransmissionDef, body?: string): string {
  const prec = transmission.precedence ?? 'ROUTINE';
  const from = transmission.originator ?? transmission.sender;
  const to = transmission.addressee ?? 'TANGO-SEVEN';
  const text = body ?? transmission.message;
  return `PREC ${prec}\nFROM ${from}\nTO ${to}\n${text}`;
}

export function formatAcpPreview(transmission: TransmissionDef, body: string): string {
  return formatAcpSlip(transmission, body);
}
