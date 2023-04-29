"use strict";

const fs = require("fs");
const kuromojin = require("kuromojin");
const createMatcher = require("morpheme-match-all");
const yaml = require("js-yaml");

const path = require("path");

const text = fs.readFileSync(path.join(__dirname, "/../dict/hojodoushi.yml"), "utf-8");

function loadDictionaries() {
  const dictionaries = [];
  const data = yaml.safeLoad(text);

  data.dict.forEach(function (item) {
    var form = "";
    item.tokens.forEach(function (token) {
      form += token.surface_form;
    });
    dictionaries.push({
      message: data.message + ": \"" + form + "\" => \"" + item.expected + "\"",
      fix: item.expected,
      tokens: item.tokens
    });
  });

  return dictionaries;
}

function reporter(context) {
  const matchAll = createMatcher(loadDictionaries());
  const {Syntax, RuleError, report, getSource, fixer} = context;
  return {
    [Syntax.Str](node){ // "Str" node
      const text = getSource(node); // Get text
      return kuromojin.tokenize(text).then((actualTokens) => {
        const results = matchAll(actualTokens);

        if (results.length == 0) {
          return;
        }

        results.forEach(function (result) {
          const tokenIndex = result.index;
          const index = getIndexFromTokens(tokenIndex, actualTokens);
          let replaceFrom = "";
          result.tokens.forEach(function(token){
            replaceFrom += token.surface_form;
          });
          const replaceTo = fixer.replaceTextRange([index, index + replaceFrom.length], result.dict.fix);
          const ruleError = new RuleError(result.dict.message, {
            index: index,
            fix:   replaceTo // https://github.com/textlint/textlint/blob/master/docs/rule-fixable.md
          });
          report(node, ruleError);
        });
      });
    }
  };
}

function getIndexFromTokens(tokenIndex, actualTokens) {
  let index = 0;
  for ( let i = 0; i < tokenIndex; i++) {
    index += actualTokens[i].surface_form.length;
  }
  return index;
}

module.exports = {
  linter: reporter,
  fixer: reporter
};