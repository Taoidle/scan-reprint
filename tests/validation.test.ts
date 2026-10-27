import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/shared/validate';
import { defaults, type Settings } from '../src/shared/model';
const check=(raw:string,patch:Partial<Settings>={})=>validate({raw,settings:{...defaults,...patch}});
test('preserves exact data, never guesses symbology or trims',()=>{
  assert.equal(check(' 000aBc ').content,' 000aBc ');
  assert.equal(check('4006381333931').symbology,'qrcode');
  assert.equal(check('https://example.com/?x=^XZ').content,'https://example.com/?x=^XZ');
});
test('only configured non-GS1 AIM is interpreted',()=>{
  assert.equal(check(']C0000123',{aim:true}).content,'000123');
  assert.equal(check(']C0000123',{aim:true}).symbology,'code128');
  assert.equal(check(']C0000123').content,']C0000123');
  for(const raw of [']C10123',']Q30123',']d20123',']Z00123'])assert.throws(()=>check(raw,{aim:true}));
  assert.throws(()=>check(']C0x',{aim:true,aimPrefixes:[']Q1']}));
  assert.throws(()=>check('abc',{aimPrefixes:[']C1']}));
});
test('EAN requires all 13 digits and a valid checksum',()=>{
  assert.equal(check('0000000000000',{symbology:'ean13'}).content,'0000000000000');
  assert.equal(check('4006381333931',{symbology:'ean13'}).content,'4006381333931');
  for(const raw of ['400638133393','4006381333932',' 4006381333931'])assert.throws(()=>check(raw,{symbology:'ean13'}));
});
test('control, binary and invalid Unicode rejection is explicit',()=>{
  for(const raw of ['\0','a\n','a\t','a\x1db','\ud800','\x7f',''])assert.throws(()=>check(raw));
  assert.equal(check('中文🙂',{humanText:false}).content,'中文🙂');
  assert.throws(()=>check('中文'));assert.throws(()=>check('中文',{humanText:false,symbology:'code128'}));
  assert.throws(()=>check('中文',{humanText:false,symbology:'datamatrix'}));
});
test('IPC settings boundaries reject coercion, nonfinite and command injection',()=>{
  for(const patch of [{width:NaN},{height:Infinity},{copies:1.2},{copies:101},{dpi:600},{port:0},{host:'host\r\nPRINT 1',transport:'tspl'},{printer:'a\0b'}])assert.throws(()=>check('x',patch as Partial<Settings>));
  assert.throws(()=>validate(null));assert.throws(()=>validate({raw:'x',settings:{...defaults,width:'60'}}));
  assert.throws(()=>check('x'.repeat(1025)));
  assert.equal(check('x',{transport:'zpl',host:'192.168.1.10'}).settings.host,'192.168.1.10');
});
