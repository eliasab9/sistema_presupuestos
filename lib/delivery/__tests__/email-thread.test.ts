import { describe, it, expect } from 'vitest';
import {
  parseEmailThreadRef,
  buildReplyHeaders,
  buildReplySubject,
  stripReplyPrefix,
} from '../email-thread';

describe('stripReplyPrefix', () => {
  it('saca el Re:', () => {
    expect(stripReplyPrefix('Re: Presupuesto motor')).toBe('Presupuesto motor');
  });

  it('saca prefijos encadenados', () => {
    expect(stripReplyPrefix('RE: Fwd: Re: Presupuesto')).toBe('Presupuesto');
  });

  it('saca el formato RE[2]:', () => {
    expect(stripReplyPrefix('RE[2]: Presupuesto')).toBe('Presupuesto');
  });

  it('deja intacto un asunto sin prefijo', () => {
    expect(stripReplyPrefix('Presupuesto motor')).toBe('Presupuesto motor');
  });
});

describe('parseEmailThreadRef', () => {
  it('devuelve null con texto vacío', () => {
    expect(parseEmailThreadRef('')).toBeNull();
    expect(parseEmailThreadRef('   ')).toBeNull();
  });

  it('devuelve null si no hay un Message-ID válido', () => {
    expect(parseEmailThreadRef('no hay nada acá')).toBeNull();
  });

  it('acepta un Message-ID suelto sin <>', () => {
    expect(parseEmailThreadRef('abc123@mail.outlook.com')).toEqual({
      messageId: '<abc123@mail.outlook.com>',
      references: undefined,
      subject: undefined,
    });
  });

  it('acepta un Message-ID suelto con <>', () => {
    expect(parseEmailThreadRef('<abc123@mail.outlook.com>')?.messageId).toBe(
      '<abc123@mail.outlook.com>'
    );
  });

  it('lee los encabezados completos', () => {
    const raw = [
      'From: cliente@empresa.com',
      'Subject: Re: Pedido de presupuesto',
      'Message-ID: <hijo@empresa.com>',
      'References: <abuelo@empresa.com> <padre@empresa.com>',
    ].join('\r\n');

    expect(parseEmailThreadRef(raw)).toEqual({
      messageId: '<hijo@empresa.com>',
      references: '<abuelo@empresa.com> <padre@empresa.com>',
      subject: 'Pedido de presupuesto',
    });
  });

  it('desarma encabezados partidos en varias líneas', () => {
    const raw = [
      'Message-ID: <hijo@empresa.com>',
      'References: <uno@empresa.com>',
      '\t<dos@empresa.com>',
      ' <tres@empresa.com>',
    ].join('\r\n');

    expect(parseEmailThreadRef(raw)?.references).toBe(
      '<uno@empresa.com> <dos@empresa.com> <tres@empresa.com>'
    );
  });

  it('usa In-Reply-To cuando no hay References', () => {
    const raw = ['Message-ID: <hijo@empresa.com>', 'In-Reply-To: <padre@empresa.com>'].join('\n');
    expect(parseEmailThreadRef(raw)?.references).toBe('<padre@empresa.com>');
  });

  it('no repite el propio Message-ID dentro de References', () => {
    const raw = [
      'Message-ID: <hijo@empresa.com>',
      'References: <padre@empresa.com> <hijo@empresa.com>',
    ].join('\n');
    expect(parseEmailThreadRef(raw)?.references).toBe('<padre@empresa.com>');
  });

  it('es insensible a mayúsculas en el nombre del encabezado', () => {
    expect(parseEmailThreadRef('message-id: <x@y.com>')?.messageId).toBe('<x@y.com>');
  });
});

describe('buildReplyHeaders', () => {
  it('usa el messageId como In-Reply-To y lo agrega al final de References', () => {
    expect(
      buildReplyHeaders({ messageId: '<padre@x.com>', references: '<abuelo@x.com>' })
    ).toEqual({
      inReplyTo: '<padre@x.com>',
      references: '<abuelo@x.com> <padre@x.com>',
    });
  });

  it('sin References previas, la cadena es sólo el padre', () => {
    expect(buildReplyHeaders({ messageId: '<padre@x.com>' })).toEqual({
      inReplyTo: '<padre@x.com>',
      references: '<padre@x.com>',
    });
  });

  it('no duplica si el padre ya estaba en References', () => {
    expect(
      buildReplyHeaders({ messageId: '<padre@x.com>', references: '<padre@x.com>' }).references
    ).toBe('<padre@x.com>');
  });
});

describe('buildReplySubject', () => {
  it('prefija Re:', () => {
    expect(buildReplySubject('Pedido de presupuesto')).toBe('Re: Pedido de presupuesto');
  });

  it('no encadena Re: Re:', () => {
    expect(buildReplySubject('Re: Pedido')).toBe('Re: Pedido');
  });
});
