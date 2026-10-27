import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['dist/**','release/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.mjs'],languageOptions:{globals:{process:'readonly',console:'readonly',Buffer:'readonly',setTimeout:'readonly',window:'readonly',document:'readonly',innerWidth:'readonly'}}},{rules:{'@typescript-eslint/no-explicit-any':'error'}});
