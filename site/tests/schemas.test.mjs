// The schemas in site/content/schemas let an editor check the content while
// it is written. These tests keep them in step with what the generator
// checks, and check the real content against them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EFFECT, KINDS, PIECE, STATUSES, TRACK, VARIANTS } from '../build.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(SITE, 'content');
const schema = name => JSON.parse(fs.readFileSync(path.join(CONTENT, 'schemas', `${name}.schema.json`), 'utf8'));
const json = file => JSON.parse(fs.readFileSync(path.join(CONTENT, file), 'utf8'));

// The part of JSON Schema (draft-07) the schemas use
function errors(value, s, at = '') {
    const out = [];
    if (s.enum && !s.enum.includes(value)) out.push(`${at}: ${JSON.stringify(value)} no está en la lista`);
    if (s.anyOf && s.anyOf.every(option => errors(value, option, at).length)) out.push(`${at}: no vale ninguna forma`);
    if (s.type) {
        const is = { object: v => v && typeof v === 'object' && !Array.isArray(v), array: Array.isArray, string: v => typeof v === 'string', number: v => typeof v === 'number', integer: Number.isInteger }[s.type];
        if (!is(value)) return [...out, `${at}: no es ${s.type}`];
    }
    if (typeof value === 'string') {
        if (s.minLength && value.length < s.minLength) out.push(`${at}: vacío`);
        if (s.pattern && !new RegExp(s.pattern).test(value)) out.push(`${at}: ${JSON.stringify(value)} no tiene la forma ${s.pattern}`);
    }
    if (typeof value === 'number') {
        if (s.minimum !== undefined && value < s.minimum) out.push(`${at}: menor que ${s.minimum}`);
        if (s.maximum !== undefined && value > s.maximum) out.push(`${at}: mayor que ${s.maximum}`);
        if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum) out.push(`${at}: no es mayor que ${s.exclusiveMinimum}`);
    }
    if (Array.isArray(value)) {
        if (s.minItems && value.length < s.minItems) out.push(`${at}: menos de ${s.minItems}`);
        if (s.items) value.forEach((item, i) => out.push(...errors(item, s.items, `${at}[${i}]`)));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const key of s.required || []) if (!(key in value)) out.push(`${at}.${key}: falta`);
        for (const [key, v] of Object.entries(value)) {
            if (s.properties && key in s.properties) out.push(...errors(v, s.properties[key], `${at}.${key}`));
            else if (s.additionalProperties === false) out.push(`${at}.${key}: no se espera`);
        }
    }
    return out;
}

test('the schemas ask for the same fields and values the generator checks', () => {
    const fields = name => schema(name).required.filter(key => key !== 'status').sort();
    assert.deepEqual(fields('pista'), Object.keys(TRACK).sort());
    assert.deepEqual(fields('imagen'), Object.keys(PIECE).sort());
    assert.deepEqual(schema('efectos').properties.effects.items.required.sort(), Object.keys(EFFECT).sort());
    assert.deepEqual(schema('imagen').properties.kind.enum, KINDS);
    assert.deepEqual(schema('efectos').properties.effects.items.properties.variant.enum, VARIANTS);
    for (const name of ['pista', 'imagen', 'efectos', 'sobre', 'algoritmo']) {
        assert.deepEqual(schema(name).properties.status.enum, STATUSES, name);
    }
});

test('the content follows its schemas', () => {
    const files = [
        ...fs.readdirSync(path.join(CONTENT, 'musica')).map(f => [`musica/${f}`, 'pista']),
        ...fs.readdirSync(path.join(CONTENT, 'imagenes')).map(f => [`imagenes/${f}`, 'imagen']),
        ...fs.readdirSync(path.join(CONTENT, 'algoritmos')).map(d => [`algoritmos/${d}/meta.json`, 'algoritmo']),
        ['efectos.json', 'efectos'], ['sobre.json', 'sobre'], ['site.json', 'site'],
    ];
    for (const [file, name] of files) assert.deepEqual(errors(json(file), schema(name), file), [], file);
});

test('the schemas catch the usual mistakes', () => {
    const track = json('musica/01-marea-baja.json');
    assert.notDeepEqual(errors({ ...track, dur: '3.42' }, schema('pista')), []);
    assert.notDeepEqual(errors({ ...track, titulo: 'x' }, schema('pista')), []);
    assert.notDeepEqual(errors({ ...track, status: 'publicado' }, schema('pista')), []);
    const site = json('site.json');
    assert.notDeepEqual(errors({ ...site, links: [{ status: 'draft', name: 'x', url: 'javascript:alert(1)' }] }, schema('site')), []);
});
