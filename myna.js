// Myna Parsing Library
// Copyright (c) 2016 Christopher Diggins
// Usage permitted under terms of MIT License
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// A parsing combinator library for JavaScript/TypeScript based on the PEG formalism.
// For more information see http://www.github.com/cdiggins/myna-parser
// NOTE: we are explicitly bypassing using the TypeScript "export" keyword for 
// the Myna module otherwise the module won't be usable from browsers without 
// using an additional moduler loader library. Instead we have manual  
// export code at the bottom of the file. 
var Myna;
(function (Myna) {
    // A special immutable class used internally for creating AstNodes 
    var NodeBldr = (function () {
        function NodeBldr(rule, begin, end, nodes) {
            if (rule === void 0) { rule = null; }
            if (begin === void 0) { begin = null; }
            if (end === void 0) { end = null; }
            if (nodes === void 0) { nodes = null; }
            this.rule = rule;
            this.begin = begin;
            this.end = end;
            this.nodes = nodes;
        }
        // Adds a new AstNode to the NodeBldr 
        NodeBldr.prototype.addNode = function (rule, begin, end) {
            return new NodeBldr(rule, begin, end, this);
        };
        // Creates an AstNode from the NodeBldr 
        NodeBldr.prototype.toAst = function () {
            // TODO: create the child arrays and stuff
            return this.begin && this.end
                ? new AstNode(this.rule, this.begin.input, this.begin.index, this.end.index)
                : null;
        };
        return NodeBldr;
    }());
    // This stores the state of the parser and is passed to the parse and match functions.
    var Parser = (function () {
        function Parser(input, index, nodes) {
            this.input = input;
            this.index = index;
            this.nodes = nodes;
        }
        Object.defineProperty(Parser.prototype, "inRange", {
            // Returns true if the index is within the input range. 
            get: function () {
                return this.index >= 0 && this.index < this.input.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "location", {
            // Returns a string representation of the location. 
            get: function () {
                return this.index.toString();
            },
            enumerable: true,
            configurable: true
        });
        // Returns a shallow copy of the parser that advances its position
        Parser.prototype.advance = function (n) {
            if (n === void 0) { n = 1; }
            return new Parser(this.input, this.index + n, this.nodes);
        };
        Object.defineProperty(Parser.prototype, "debugContext", {
            // Returns a string that helps debugging to figure out exactly where we are in the input string 
            get: function () {
                var contextWidth = 5;
                var start = this.index - contextWidth - 1;
                if (start < 0)
                    start = 0;
                var prefix = this.input.slice(start, this.index - 1);
                var end = this.index + contextWidth;
                if (end >= this.input.length)
                    end = this.input.length - 1;
                var postfix = this.input.slice(this.index, end);
                return prefix + ">>>" + this.input[this.index] + "<<<" + postfix;
            },
            enumerable: true,
            configurable: true
        });
        return Parser;
    }());
    Myna.Parser = Parser;
    // The internal parse function 
    function impl(rule, start, end) {
        if (end == null)
            return null;
        if (!rule._createAstNode)
            return end;
        return new Parser(end.input, end.index, end.nodes.addNode(rule, start, this));
    }
    // Returns the root node of the abstract syntax tree created 
    // by parsing the rule. 
    function parse(r, s) {
        var p = new Parser(s, 0, new NodeBldr());
        p = r.ast.parse(p);
        return p ? p.nodes.toAst() : null;
    }
    Myna.parse = parse;
    // Returns an array of nodes created by parsing the given rule repeatedly until 
    // it fails or the end of the input is arrived. One Astnode is created for each time 
    // the token is parsed successfully, whether or not it explicitly has the "_createAstNode" 
    // flag set explicitly. 
    function tokenize(r, s) {
        var result = this.parse(r.ast.zeroOrMore, s);
        return result ? result.children : [];
    }
    Myna.tokenize = tokenize;
    //====================================================================================
    // Internal variables used by the Myna library
    // A lookup table of all grammars registered with the Myna module 
    Myna.grammars = {};
    // A lookup table of all named rules registered with the Myna module
    Myna.allRules = {};
    // Generates a new ID for each rule 
    var _nextId = 0;
    function genId() {
        return _nextId++;
    }
    // The returned value of a failed parse
    var failed = -1;
    // Given a RuleType returns an instance of a Rule.
    function RuleTypeToRule(rule) {
        if (rule instanceof Rule)
            return rule;
        if (typeof (rule) === "string")
            return text(rule);
        if (typeof (rule) === "boolean")
            return rule ? Myna.truePredicate : Myna.falsePredicate;
        throw new Error("Invalid rule type: " + rule);
    }
    Myna.RuleTypeToRule = RuleTypeToRule;
    //===============================================================
    // AstNode class 
    // Represents a node in the generated parse tree. These nodes are returned by the Rule.parse function. If a Rule 
    // has the "_createAstNode" field set to true (because you created the rule using the ".ast" property), then the 
    // generated node will also be added to the constructed parse tree.   
    var AstNode = (function () {
        // Constructs a new node associated with the given rule.  
        function AstNode(rule, input, start, end) {
            if (start === void 0) { start = 0; }
            if (end === void 0) { end = failed; }
            this.rule = rule;
            this.input = input;
            this.start = start;
            this.end = end;
            // The list of child nodes in the parse tree. 
            // This is not allocated unless used, to minimize memory consumption 
            this.children = null;
        }
        Object.defineProperty(AstNode.prototype, "name", {
            // Returns the name of the rule associated with this node
            get: function () { return this.rule != null ? this.rule.name : "unnamed"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "fullName", {
            // Returns the name of the rule, preceded by the grammar name, associated with this node
            get: function () { return this.rule != null ? this.rule.fullName : "unnamed"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "allText", {
            // Returns the parsed text associated with this node's start and end locations  
            get: function () { return this.input.slice(this.start, this.end); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "isLeaf", {
            // Returns true if this node has no children
            get: function () { return this.children == null || this.children.length == 0; },
            enumerable: true,
            configurable: true
        });
        // Returns the first child with the given name, or null if no named child is found. 
        AstNode.prototype.child = function (name) {
            if (this.children)
                for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (c.name == name)
                        return c;
                }
            return null;
        };
        Object.defineProperty(AstNode.prototype, "_firstChildStart", {
            // The position of the first child, or the end position for the entire node if no children 
            get: function () {
                return this.isLeaf ? this.end : this.children[0].start;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "_lastChildEnd", {
            // The end position of the last child, or the end position for the entire node if no children 
            get: function () {
                return this.isLeaf ? this.end : this.children[0].end;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "beforeChildrenText", {
            // Returns the text before the children, or if no children returns the entire text. 
            get: function () {
                return this.input.slice(this.start, this._firstChildStart);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "afterChildrenText", {
            // Returns the text after the children, or if no children returns the empty string.
            get: function () {
                return this.input.slice(this._lastChildEnd, this.end);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "allChildrenText", {
            // Returns the text from the beginning of the first child to the end of the last child.
            get: function () {
                return this.input.slice(this._firstChildStart, this._lastChildEnd);
            },
            enumerable: true,
            configurable: true
        });
        return AstNode;
    }());
    Myna.AstNode = AstNode;
    //===============================================================
    // Rule class     
    // A Rule is both a rule in the PEG grammar and a parser. The parse function takes  
    // a particular parse location (in either a string, or array of tokens) and will return 
    // the location of the end of the parse if successful or the constant failed (-1)
    // if not successful.  
    var Rule = (function () {
        // Note: child-rules are exposed as a public field
        function Rule(rules) {
            this.rules = rules;
            // Identifies individual rule
            this.name = "";
            // Identifies the grammar that this rule belongs to 
            this.grammarName = "";
            // Internal unique identifier
            this.id = genId();
            // Identifies types of rules. Rules can have "types" that are different than the class name
            this.type = "";
            // Used to provide access to the name of the class 
            this.className = "Rule";
            // Indicates whether generated nodes should be added to the abstract syntax tree
            this._createAstNode = false;
        }
        // If successful returns the end-location of where this Rule matches the input 
        Rule.prototype.parse = function (p) {
            throw new Error("Missing override for parse");
        };
        // Defines the type of rules. Used for defining new rule types as combinators.
        // Warning: this modifies the rule, use "copy" first if you don't want to update the rule.
        Rule.prototype.setType = function (typeName) {
            this.type = typeName;
            return this;
        };
        // Sets the name of the rule, and the grammar 
        // Warning: this modifies the rule, use "copy" first if you don't want to update the rule.
        Rule.prototype.setName = function (grammarName, ruleName) {
            this.grammarName = grammarName;
            this.name = ruleName;
            return this;
        };
        Object.defineProperty(Rule.prototype, "definition", {
            // Returns a default definition of the rule
            get: function () {
                return this.type + "(" + this.rules.map(function (r) { return r.toString(); }).join(", ") + ")";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "fullName", {
            // Returns the name of the rule preceded by the grammar name and a "."
            get: function () {
                return this.grammarName + "." + this.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "nameOrDefinition", {
            // Returns either the name of the rule, or it's definition
            get: function () {
                return this.name
                    ? this.fullName
                    : this.definition;
            },
            enumerable: true,
            configurable: true
        });
        // Returns a string representation of the rule 
        Rule.prototype.toString = function () {
            return this.nameOrDefinition;
        };
        Object.defineProperty(Rule.prototype, "firstChild", {
            // Returns the first child rule
            get: function () {
                return this.rules[0];
            },
            enumerable: true,
            configurable: true
        });
        // Returns a copy of this rule with default values for all fields.  
        // Note: Every new rule class must override cloneImplemenation
        Rule.prototype.cloneImplementation = function () {
            throw new Error("Missing override for cloneImplementation");
        };
        Object.defineProperty(Rule.prototype, "copy", {
            // Returns a copy of this rule with all fields copied.  
            get: function () {
                var r = this.cloneImplementation();
                if (typeof (r) !== typeof (this))
                    throw new Error("Error in implementation of cloneImplementation: not returning object of correct type");
                r.name = this.name;
                r.grammarName = this.grammarName;
                r.type = this.type;
                r._createAstNode = this._createAstNode;
                return r;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "ast", {
            // Returns a copy of the rule that will create a node in the parse tree.
            // This property is the only way to create rules that generate nodes in a parse tree. 
            get: function () {
                var r = this.copy;
                r._createAstNode = true;
                return r;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "hasAstChildRule", {
            //  Returns true if any of the child rules are "ast rules" meaning they create nodes in the 
            // parse tree.
            get: function () {
                return this.rules.filter(function (r) { return r.isAstRule; }).length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "isAstRule", {
            // Returns true if this rule when parsed successfully will create a node in the parse tree 
            get: function () {
                return this._createAstNode || (this.hasAstChildRule
                    && (this instanceof Sequence || this instanceof Choice || this instanceof Quantified));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "astRuleDefn", {
            // Returns a string that describes the AST nodes created by this rule.
            // Will throw an exception if this is not a valid AST rule (this.isAstRule != true)
            get: function () {
                var rules = this.rules.filter(function (r) { return r.isAstRule; });
                if (!rules.length)
                    return this.name;
                if (rules.length == 1) {
                    var result = rules[0].astRuleNameOrDefn;
                    if (this instanceof Quantified)
                        result += "[" + this.min + "," + this.max + "]";
                    return result;
                }
                if (this instanceof Sequence)
                    return "seq(" + rules.map(function (r) { return r.astRuleNameOrDefn; }).join(",") + ")";
                if (this instanceof Choice)
                    return "choice(" + rules.map(function (r) { return r.astRuleNameOrDefn; }).join(",") + ")";
                throw new Error("Internal error: not a valid AST rule");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "astRuleNameOrDefn", {
            // Returns a string that is either the name of the AST parse node, or a definition 
            // (schema) describing the makeup of the rules. 
            get: function () {
                if (this._createAstNode)
                    return this.name;
                return this.astRuleDefn;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "opt", {
            //======================================================
            // Extensions to support method/property chaining. 
            // This is also known as a fluent API syntax
            get: function () { return opt(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "zeroOrMore", {
            get: function () { return zeroOrMore(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "oneOrMore", {
            get: function () { return oneOrMore(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "at", {
            get: function () { return at(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "not", {
            get: function () { return not(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "advance", {
            get: function () { return this.then(Myna.advance); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "ws", {
            get: function () { return this.then(Myna.ws); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "all", {
            get: function () { return this.then(Myna.all); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "end", {
            get: function () { return this.then(Myna.end); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "assert", {
            get: function () { return assert(this); },
            enumerable: true,
            configurable: true
        });
        Rule.prototype.then = function (r) { return seq(this, r); };
        Rule.prototype.thenAt = function (r) { return this.then(at(r)); };
        Rule.prototype.thenNot = function (r) { return this.then(not(r)); };
        Rule.prototype.or = function (r) { return choice(this, r); };
        Rule.prototype.until = function (r) { return repeatWhileNot(this, r); };
        Rule.prototype.untilPast = function (r) { return repeatUntilPast(this, r); };
        Rule.prototype.repeat = function (count) { return repeat(this, count); };
        Rule.prototype.quantified = function (min, max) { return quantified(this, min, max); };
        Rule.prototype.delimited = function (delimiter) { return delimited(this, delimiter); };
        Rule.prototype.butNot = function (r) { return not(r).then(this); };
        return Rule;
    }());
    Myna.Rule = Rule;
    //===============================================================
    // Rule derived classes 
    // These are the core Rule classes of Myna. Normally you would not use theses directly but use the factory methods
    // If you fork this code, think twice before adding new classes here. Maybe you can implement your new Rule
    // in terms of functions or other low-level rules. Then you can be happy knowing that the same code is being 
    // re-used and tested all the time.  
    // Matches a series of rules in order. Succeeds only if all sub-rules succeed. 
    var Sequence = (function (_super) {
        __extends(Sequence, _super);
        function Sequence(rules) {
            _super.call(this, rules);
            this.type = "seq";
            this.className = "Sequence";
        }
        Sequence.prototype.parse = function (p) {
            var result = p;
            for (var _i = 0, _a = this.rules; _i < _a.length; _i++) {
                var r = _a[_i];
                result = r.parse(result);
                if (!result)
                    return null;
            }
            return impl(this, p, result);
        };
        Object.defineProperty(Sequence.prototype, "definition", {
            get: function () {
                var result = this.rules.map(function (r) { return r.toString(); }).join(" ");
                if (this.rules.length > 1)
                    result = "(" + result + ")";
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Sequence.prototype.cloneImplementation = function () { return new Sequence(this.rules); };
        return Sequence;
    }(Rule));
    Myna.Sequence = Sequence;
    // Tries to match each rule in order until one succeeds. Succeeds if any of the sub-rules succeed. 
    var Choice = (function (_super) {
        __extends(Choice, _super);
        function Choice(rules) {
            _super.call(this, rules);
            this.type = "choice";
            this.className = "Choice";
        }
        Choice.prototype.parse = function (p) {
            for (var _i = 0, _a = this.rules; _i < _a.length; _i++) {
                var r = _a[_i];
                var result = r.parse(p);
                if (result)
                    return impl(this, p, result);
            }
            return null;
        };
        Object.defineProperty(Choice.prototype, "definition", {
            get: function () {
                var result = this.rules.map(function (r) { return r.toString(); }).join(" / ");
                if (this.rules.length > 1)
                    result = "(" + result + ")";
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Choice.prototype.cloneImplementation = function () { return new Choice(this.rules); };
        return Choice;
    }(Rule));
    Myna.Choice = Choice;
    // A generalization of several rules such as zeroOrMore (0+), oneOrMore (1+), opt(0 or 1),
    // When matching with an unbounded upper limit set the maxium to  -1   
    var Quantified = (function (_super) {
        __extends(Quantified, _super);
        function Quantified(rule, min, max) {
            if (min === void 0) { min = 0; }
            if (max === void 0) { max = Infinity; }
            _super.call(this, [rule]);
            this.min = min;
            this.max = max;
            this.type = "quantified";
            this.className = "Quantified";
        }
        Quantified.prototype.parse = function (p) {
            var result = p;
            for (var i = 0; i < this.max; ++i) {
                var tmp = this.firstChild.parse(result);
                // If parsing the rule fails, we return the last result, or failed 
                // if the minimum number of matches is not met. 
                if (tmp == null)
                    return i >= this.min ? impl(this, p, result) : null;
                // Check for progress, to assure we aren't hitting an infinite loop  
                // Without this it is possible to accidentally put a zeroOrMore with a predicate.
                // For example: myna.truePredicate.zeroOrMore would loop forever 
                if (this.max === Infinity && result.index === tmp.index)
                    throw new Error("Infinite loop: unbounded quanitifed rule is not making progress");
                result = tmp;
            }
            return impl(this, p, result);
        };
        Object.defineProperty(Quantified.prototype, "definition", {
            // Used for creating a human readable definition of the grammar.
            get: function () {
                if (this.min == 0 && this.max == 1)
                    return this.firstChild.toString() + "?";
                if (this.min == 0 && this.max == Infinity)
                    return this.firstChild.toString() + "*";
                if (this.min == 1 && this.max == Infinity)
                    return this.firstChild.toString() + "+";
                return this.firstChild.toString() + "{" + this.min + "," + this.max + "}";
            },
            enumerable: true,
            configurable: true
        });
        Quantified.prototype.cloneImplementation = function () { return new Quantified(this.firstChild, this.min, this.max); };
        return Quantified;
    }(Rule));
    Myna.Quantified = Quantified;
    // Advances the parser by one token unless at the end
    // Never creates a node.
    var Advance = (function (_super) {
        __extends(Advance, _super);
        function Advance() {
            _super.call(this, []);
            this.type = "advance";
            this.className = "Advance";
        }
        Advance.prototype.parse = function (p) { return p.inRange ? p.advance() : null; };
        Object.defineProperty(Advance.prototype, "definition", {
            get: function () { return "<advance>"; },
            enumerable: true,
            configurable: true
        });
        Advance.prototype.cloneImplementation = function () { return new Advance(); };
        return Advance;
    }(Rule));
    Myna.Advance = Advance;
    // Uses a lookup table to find the next rule to parse next from the current token 
    var Lookup = (function (_super) {
        __extends(Lookup, _super);
        function Lookup(lookup, onDefault) {
            _super.call(this, []);
            this.lookup = lookup;
            this.onDefault = onDefault;
            this.type = "lookup";
            this.className = "Lookup";
        }
        Lookup.prototype.parse = function (p) {
            if (!p.inRange)
                return null;
            var tkn = p.input[p.index];
            var r = this.lookup[tkn];
            if (r !== undefined)
                return impl(this, p, r.parse(p));
            return impl(this, p, this.onDefault.parse(p));
        };
        Object.defineProperty(Lookup.prototype, "definition", {
            get: function () {
                var _this = this;
                return '{' + Object.keys(this.lookup).map(function (k) { return '"' + escapeChars(k) + '" :' + _this.lookup[k].toString(); }).join(',') + '}';
            },
            enumerable: true,
            configurable: true
        });
        Lookup.prototype.cloneImplementation = function () { return new Lookup(this.lookup, this.onDefault); };
        return Lookup;
    }(Rule));
    Myna.Lookup = Lookup;
    // Creates a dictionary from a set of tokens, mapping each one to the same rule.     
    function tokensToDictionary(tokens, rule) {
        var d = {};
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var t = tokens_1[_i];
            d[t] = RuleTypeToRule(rule);
        }
        return d;
    }
    Myna.tokensToDictionary = tokensToDictionary;
    // A specialization of the lookup 
    var CharSet = (function (_super) {
        __extends(CharSet, _super);
        function CharSet(chars) {
            _super.call(this, []);
            this.chars = chars;
            this.type = "charSet";
            this.className = "CharSet";
            this.lookup = {};
            for (var _i = 0, _a = chars.split(""); _i < _a.length; _i++) {
                var c = _a[_i];
                this.lookup[c] = true;
            }
        }
        CharSet.prototype.parse = function (p) {
            if (!p.inRange)
                return null;
            var tkn = p.input[p.index];
            return tkn in this.lookup ? impl(this, p, p.advance()) : null;
        };
        Object.defineProperty(CharSet.prototype, "definition", {
            get: function () { return "[" + escapeChars(this.chars) + "]"; },
            enumerable: true,
            configurable: true
        });
        ;
        CharSet.prototype.cloneImplementation = function () { return new CharSet(this.chars); };
        return CharSet;
    }(Rule));
    Myna.CharSet = CharSet;
    // A specialization of the lookup 
    // Advances if the current token is within a range of characters, otherwise returns false
    var CharRange = (function (_super) {
        __extends(CharRange, _super);
        function CharRange(min, max) {
            _super.call(this, []);
            this.min = min;
            this.max = max;
            this.type = "charRange";
            this.className = "CharRange";
            if (min.length != 1 || max.length != 1)
                throw new Error("rangeToDictionary requires characters as inputs");
            this.minCode = min.charCodeAt(0);
            this.maxCode = max.charCodeAt(0);
        }
        CharRange.prototype.parse = function (p) {
            if (!p.inRange)
                return null;
            var tknVal = p.input[p.index].charCodeAt(0);
            return (tknVal >= this.minCode && tknVal <= this.maxCode) ? impl(this, p, p.advance()) : null;
        };
        Object.defineProperty(CharRange.prototype, "definition", {
            get: function () { return "[" + this.min + ".." + this.max + "]"; },
            enumerable: true,
            configurable: true
        });
        ;
        CharRange.prototype.cloneImplementation = function () { return new CharRange(this.min, this.max); };
        return CharRange;
    }(Rule));
    Myna.CharRange = CharRange;
    // Used to match a string in the input string 
    var Text = (function (_super) {
        __extends(Text, _super);
        function Text(text) {
            _super.call(this, []);
            this.text = text;
            this.type = "text";
            this.className = "Text";
        }
        Text.prototype.parse = function (p) {
            if (p.index > p.input.length - this.text.length)
                return null;
            for (var i = 0; i < this.text.length; ++i)
                if (p.input[p.index + i] !== this.text[i])
                    return null;
            return impl(this, p, p.advance(this.text.length));
        };
        Object.defineProperty(Text.prototype, "definition", {
            get: function () { return '"' + escapeChars(this.text) + '"'; },
            enumerable: true,
            configurable: true
        });
        ;
        Text.prototype.cloneImplementation = function () { return new Text(this.text); };
        return Text;
    }(Rule));
    Myna.Text = Text;
    // Creates a rule that is defined from a function that generates the rule. 
    // This allows two rules to have a cyclic relation. 
    var Delay = (function (_super) {
        __extends(Delay, _super);
        function Delay(fn) {
            _super.call(this, []);
            this.fn = fn;
            this.type = "delay";
            this.className = "Delay";
        }
        Delay.prototype.parse = function (p) { return impl(this, p, this.fn().parse(p)); };
        Delay.prototype.cloneImplementation = function () { return new Delay(this.fn); };
        Object.defineProperty(Delay.prototype, "definition", {
            get: function () { return "delay(" + this.fn() + ")"; },
            enumerable: true,
            configurable: true
        });
        return Delay;
    }(Rule));
    Myna.Delay = Delay;
    //=======================================
    // Zero length rules: they don't create nodes 
    // Returns true only if the child rule fails to match.
    var Not = (function (_super) {
        __extends(Not, _super);
        function Not(rule) {
            _super.call(this, [rule]);
            this.type = "not";
            this.className = "Not";
        }
        Not.prototype.parse = function (p) { return !this.firstChild.parse(p) ? p : null; };
        Not.prototype.cloneImplementation = function () { return new Not(this.firstChild); };
        Object.defineProperty(Not.prototype, "definition", {
            get: function () { return "!" + this.firstChild.toString(); },
            enumerable: true,
            configurable: true
        });
        return Not;
    }(Rule));
    Myna.Not = Not;
    // Returns true only if the child rule matches, but does not advance the parser
    var At = (function (_super) {
        __extends(At, _super);
        function At(rule) {
            _super.call(this, [rule]);
            this.type = "at";
            this.className = "At";
        }
        At.prototype.parse = function (p) { return this.firstChild.parse(p) ? p : null; };
        At.prototype.cloneImplementation = function () { return new At(this.firstChild); };
        Object.defineProperty(At.prototype, "definition", {
            get: function () { return "&" + this.firstChild.toString(); },
            enumerable: true,
            configurable: true
        });
        return At;
    }(Rule));
    Myna.At = At;
    // Uses a function to return true or not based on the behavior of the predicate rule
    var Predicate = (function (_super) {
        __extends(Predicate, _super);
        function Predicate(fn) {
            _super.call(this, []);
            this.fn = fn;
            this.type = "predicate";
            this.className = "Predicate";
        }
        Predicate.prototype.parse = function (p) { return this.fn(p) ? p : null; };
        Predicate.prototype.cloneImplementation = function () { return new Predicate(this.fn); };
        Object.defineProperty(Predicate.prototype, "definition", {
            get: function () { return "<predicate>"; },
            enumerable: true,
            configurable: true
        });
        return Predicate;
    }(Rule));
    Myna.Predicate = Predicate;
    // Returns true always 
    var TruePredicate = (function (_super) {
        __extends(TruePredicate, _super);
        function TruePredicate() {
            _super.call(this, []);
            this.type = "true";
            this.className = "TruePredicate";
        }
        TruePredicate.prototype.parse = function (p) { return p; };
        TruePredicate.prototype.cloneImplementation = function () { return new TruePredicate(); };
        Object.defineProperty(TruePredicate.prototype, "definition", {
            get: function () { return "<true>"; },
            enumerable: true,
            configurable: true
        });
        return TruePredicate;
    }(Rule));
    Myna.TruePredicate = TruePredicate;
    // Returns false always 
    var FalsePredicate = (function (_super) {
        __extends(FalsePredicate, _super);
        function FalsePredicate() {
            _super.call(this, []);
            this.type = "false";
            this.className = "FalsePredicate";
        }
        FalsePredicate.prototype.parse = function (p) { return null; };
        FalsePredicate.prototype.cloneImplementation = function () { return new FalsePredicate(); };
        Object.defineProperty(FalsePredicate.prototype, "definition", {
            get: function () { return "<false>"; },
            enumerable: true,
            configurable: true
        });
        return FalsePredicate;
    }(Rule));
    Myna.FalsePredicate = FalsePredicate;
    // Returns true if at the end of the input, or false otherwise
    var AtEndPredicate = (function (_super) {
        __extends(AtEndPredicate, _super);
        function AtEndPredicate() {
            _super.call(this, []);
            this.type = "end";
            this.className = "AtEndPredicate";
        }
        AtEndPredicate.prototype.parse = function (p) { return !p.inRange ? p : null; };
        AtEndPredicate.prototype.cloneImplementation = function () { return new AtEndPredicate(); };
        Object.defineProperty(AtEndPredicate.prototype, "definition", {
            get: function () { return "<end>"; },
            enumerable: true,
            configurable: true
        });
        return AtEndPredicate;
    }(Rule));
    Myna.AtEndPredicate = AtEndPredicate;
    // Returns true if the character is not in the character set, false otherwise
    var NegatedCharSet = (function (_super) {
        __extends(NegatedCharSet, _super);
        function NegatedCharSet(chars) {
            _super.call(this, []);
            this.chars = chars;
            this.type = "negatedCharSet";
            this.className = "NegatedCharSet";
            this.lookup = {};
            for (var _i = 0, _a = chars.split(""); _i < _a.length; _i++) {
                var c = _a[_i];
                this.lookup[c] = true;
            }
        }
        NegatedCharSet.prototype.parse = function (p) {
            if (!p.inRange)
                return null;
            var tkn = p.input[p.index];
            var r = this.lookup[tkn];
            return !(tkn in this.lookup) ? p : null;
        };
        Object.defineProperty(NegatedCharSet.prototype, "definition", {
            get: function () { return "[^" + escapeChars(this.chars) + "]"; },
            enumerable: true,
            configurable: true
        });
        ;
        NegatedCharSet.prototype.cloneImplementation = function () { return new NegatedCharSet(this.chars); };
        return NegatedCharSet;
    }(Rule));
    Myna.NegatedCharSet = NegatedCharSet;
    //===============================================================
    // Rule creation function
    // Create a rule that matches the text 
    function text(text) {
        return new Text(text);
    }
    Myna.text = text;
    // Matches a series of rules in order, and succeeds if they all do
    function seq() {
        var rules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rules[_i - 0] = arguments[_i];
        }
        return new Sequence(rules.map(RuleTypeToRule));
    }
    Myna.seq = seq;
    // Tries to match each rule in order, and succeeds if one does 
    function choice() {
        var rules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rules[_i - 0] = arguments[_i];
        }
        return new Choice(rules.map(RuleTypeToRule));
    }
    Myna.choice = choice;
    // Enables Rules to be defined in terms of variables that are defined later on.
    // This enables recursive rule definitions.  
    function delay(fxn) {
        return new Delay(function () { return RuleTypeToRule(fxn()); });
    }
    Myna.delay = delay;
    // Parses successfully if the given rule does not match the input at the current location  
    function not(rule) {
        return new Not(RuleTypeToRule(rule));
    }
    Myna.not = not;
    ;
    // Attempts to apply a rule between min and max number of times inclusive. If the maximum is set to Infinity, 
    // it will attempt to match as many times as it can, but throw an exception if the parser does not advance 
    function quantified(rule, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = Infinity; }
        return new Quantified(RuleTypeToRule(rule), min, max);
    }
    Myna.quantified = quantified;
    // Attempts to apply the rule 0 or more times. Will always succeed unless the parser does not 
    // advance, in which case an exception is thrown.    
    function zeroOrMore(rule) {
        return quantified(rule).setType("zeroOrMore");
    }
    Myna.zeroOrMore = zeroOrMore;
    ;
    // Attempts to apply the rule 1 or more times. Will throw an exception if the parser does not advance.  
    function oneOrMore(rule) {
        return quantified(rule, 1).setType("oneOrMore");
    }
    Myna.oneOrMore = oneOrMore;
    // Attempts to match a rule 0 or 1 times. Always succeeds.   
    function opt(rule) {
        return quantified(rule, 0, 1).setType("opt");
    }
    Myna.opt = opt;
    ;
    // Attempts to apply a rule a precise number of times
    function repeat(rule, count) {
        return quantified(rule, count, count).setType("repeat");
    }
    Myna.repeat = repeat;
    // Returns true if the rule successfully matches, but does not advance the parser index. 
    function at(rule) {
        return new At(RuleTypeToRule(rule));
    }
    Myna.at = at;
    ;
    // Looks up the rule to parse based on whether the token in the array of not.      
    function lookup(tokens, rule, onDefault) {
        if (onDefault === void 0) { onDefault = false; }
        return new Lookup(tokensToDictionary(tokens, rule), RuleTypeToRule(onDefault));
    }
    Myna.lookup = lookup;
    //===============================================================    
    // Character set rules
    // Returns true if one of the characters is present, but does not advance the parser position
    function atChar(chars) { return at(char(chars)); }
    Myna.atChar = atChar;
    // Returns true if none of the characters are present, but does not advance the parser position 
    function notAtChar(chars) { return new NegatedCharSet(chars); }
    Myna.notAtChar = notAtChar;
    // Advances if none of the characters are present.
    function charExcept(chars) { return notAtChar(chars).advance; }
    Myna.charExcept = charExcept;
    // Returns true if one of the characters are present, and advances the parser position
    function char(chars) { return new CharSet(chars); }
    Myna.char = char;
    // Advances if one of the characters are present, or returns false
    function range(min, max) { return new CharRange(min, max); }
    Myna.range = range;
    // Advance if on of the characters are not in the range
    function exceptRange(min, max) { return range(min, max).not.then(Myna.advance); }
    Myna.exceptRange = exceptRange;
    //===============================================================    
    // Advanced rule operators 
    function delimited(rule, delimiter) { return opt(seq(rule, zeroOrMore(seq(delimiter, rule)))).setType("delimitedList"); }
    Myna.delimited = delimited;
    function except(condition, rule) { return seq(not(condition), rule).setType("except"); }
    Myna.except = except;
    function repeatWhileNot(body, condition) { return zeroOrMore(except(condition, body)).setType("whileNot"); }
    Myna.repeatWhileNot = repeatWhileNot;
    function repeatUntilPast(body, condition) { return seq(repeatWhileNot(body, condition), condition).setType("repeatUntilPast"); }
    Myna.repeatUntilPast = repeatUntilPast;
    function advanceWhileNot(rule) { return not(rule).advance.zeroOrMore.setType("advanceWhileNot"); }
    Myna.advanceWhileNot = advanceWhileNot;
    function advanceUntilPast(rule) { return seq(advanceWhileNot(rule), rule).setType("advanceUntilPast"); }
    Myna.advanceUntilPast = advanceUntilPast;
    function advanceUnless(rule) { return Myna.advance.butNot(rule).setType("advanceUnless"); }
    Myna.advanceUnless = advanceUnless;
    //===============================================================    
    // Predicates and actions  
    function predicate(fn) { return new Predicate(fn); }
    Myna.predicate = predicate;
    function action(fn) { return predicate(function (p) { fn(p); return true; }).setType("action"); }
    Myna.action = action;
    function log(msg) {
        if (msg === void 0) { msg = ""; }
        return action(function (p) { console.log(msg); }).setType("log");
    }
    Myna.log = log;
    //==================================================================
    // Assertions and errors 
    var ParseError = (function (_super) {
        __extends(ParseError, _super);
        function ParseError(parser, message) {
            _super.call(this, message);
            this.parser = parser;
            this.message = message;
        }
        return ParseError;
    }(Error));
    Myna.ParseError = ParseError;
    function err(message) {
        return action(function (p) { throw new ParseError(p, message); }).setType("err");
    }
    Myna.err = err;
    function assert(rule) {
        return choice(rule, action(function (p) {
            // This has to be embedded in a function because the rule might be in a circular definition.  
            throw new ParseError(p, "assertion failed, expected: " + RuleTypeToRule(rule));
        })).setType("assert");
    }
    Myna.assert = assert;
    //=======================================================================
    // Guarded sequences. 
    // If first part of a guarded sequence passes then each subsequent rule must pass as well 
    // otherwise an exception occurs. This helps create parsers that fail fast, and thus provide
    // better feedback for badly formed input.      
    function guardedSeq(condition) {
        var rules = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rules[_i - 1] = arguments[_i];
        }
        return seq(condition, seq.apply(void 0, rules.map(function (r) { return assert(r); }))).setType("guardedSeq");
    }
    Myna.guardedSeq = guardedSeq;
    //========================================================================    
    // Common sequences 
    function doubleQuoted(rule) { return seq("\"", rule, "\"").setType("doubleQuoted"); }
    Myna.doubleQuoted = doubleQuoted;
    function singleQuoted(rule) { return seq("'", rule, "'").setType("singleQuoted"); }
    Myna.singleQuoted = singleQuoted;
    function parenthesized(rule) { return seq("(", Myna.ws, rule, Myna.ws, ")").setType("parenthesized"); }
    Myna.parenthesized = parenthesized;
    function braced(rule) { return seq("{", Myna.ws, rule, Myna.ws, "}").setType("braced"); }
    Myna.braced = braced;
    function bracketed(rule) { return seq("[", Myna.ws, rule, Myna.ws, "]").setType("bracketed"); }
    Myna.bracketed = bracketed;
    function tagged(rule) { return seq("<", Myna.ws, rule, Myna.ws, ">").setType("tagged"); }
    Myna.tagged = tagged;
    // A complete identifier, with no other letters or numbers
    function keyword(text) { return seq(text, not(Myna.identifierNext)).setType("keyword"); }
    Myna.keyword = keyword;
    function keywords() {
        var words = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            words[_i - 0] = arguments[_i];
        }
        return choice.apply(void 0, words.map(keyword));
    }
    Myna.keywords = keywords;
    //===============================================================    
    // Core grammar rules 
    Myna.truePredicate = new TruePredicate();
    Myna.falsePredicate = new FalsePredicate();
    Myna.end = new AtEndPredicate();
    Myna.notEnd = Myna.end.not;
    Myna.advance = new Advance();
    Myna.all = Myna.advance.zeroOrMore;
    Myna.letterLower = range('a', 'z');
    Myna.letterUpper = range('A', 'Z');
    Myna.letter = choice(Myna.letterLower, Myna.letterUpper);
    Myna.letters = Myna.letter.oneOrMore;
    Myna.digit = range('0', '9');
    Myna.digits = Myna.digit.oneOrMore;
    Myna.digitNonZero = range('1', '9');
    Myna.integer = choice('0', seq(Myna.digitNonZero, Myna.digit.zeroOrMore));
    Myna.hexDigit = choice(Myna.digit, range('a', 'f'), range('A', 'F'));
    Myna.binaryDigit = char('01');
    Myna.octalDigit = range('0', '7');
    Myna.alphaNumeric = choice(Myna.letter, Myna.digit);
    Myna.underscore = text("_");
    Myna.identifierFirst = choice(Myna.letter, Myna.underscore);
    Myna.identifierNext = choice(Myna.alphaNumeric, Myna.underscore);
    Myna.identifier = seq(Myna.identifierFirst, Myna.identifierNext.zeroOrMore);
    Myna.hyphen = text("-");
    Myna.crlf = text("\r\n");
    Myna.newLine = choice(Myna.crlf, "\n");
    Myna.space = text(" ");
    Myna.tab = text("\t");
    Myna.ws = char(" \t\r\n\u00A0\uFEFF").zeroOrMore;
    Myna.wordChar = Myna.letter.or(char("-'"));
    Myna.word = Myna.letter.then(Myna.wordChar.zeroOrMore);
    //===============================================================
    // Grammar functions 
    // The following are helper functions for grammar objects. A grammar is a loosely defined concept.
    // It is any JavaScript object where one or more member fields are instances of the Rule class.    
    // Returns all rules that belong to a specific grammar and that create AST nodes. 
    function grammarAstRules(grammarName) {
        return grammarRules(grammarName).filter(function (r) { return r._createAstNode; });
    }
    Myna.grammarAstRules = grammarAstRules;
    // Returns all rules that belong to a specific grammar
    function grammarRules(grammarName) {
        return allGrammarRules().filter(function (r) { return r.grammarName == grammarName; });
    }
    Myna.grammarRules = grammarRules;
    // Returns all rules as an array sorted by name.
    function allGrammarRules() {
        return Object.keys(Myna.allRules).sort().map(function (k) { return Myna.allRules[k]; });
    }
    Myna.allGrammarRules = allGrammarRules;
    // Returns an array of names of the grammars
    function grammarNames() {
        return Object.keys(Myna.grammars).sort();
    }
    Myna.grammarNames = grammarNames;
    // Creates a string representation of a grammar 
    function grammarToString(grammarName) {
        return grammarRules(grammarName).map(function (r) { return r.fullName + " <- " + r.definition; }).join('\n');
    }
    Myna.grammarToString = grammarToString;
    // Given a rule will output the full structure of the rule as a JSON object  
    // This is useful for debugging rules and rule transformations 
    function ruleStructure(rule) {
        var r = { class: rule.className };
        if (rule.name)
            r['name'] = rule.name;
        if (rule instanceof Text)
            return "Text:" + rule.text;
        if (rule instanceof Lookup) {
            r['lookup'] = {};
            for (var r2 in rule.lookup)
                //r['lookup'][r2] = ruleStructure(rule.lookup[r2]);
                r['lookup'][r2] = rule.lookup[r2].className;
            r['default'] = ruleStructure(rule.onDefault);
        }
        else {
            if (rule.rules.length == 0)
                return rule.name ? rule.name : rule.className;
            else
                r['rules'] = rule.rules.map(ruleStructure);
        }
        return r;
    }
    Myna.ruleStructure = ruleStructure;
    // Creates a string representation of the AST schema generated by parsing the grammar 
    function astSchemaToString(grammarName) {
        return grammarAstRules(grammarName).map(function (r) { return r.name + " <- " + r.astRuleDefn; }).join('\n');
    }
    Myna.astSchemaToString = astSchemaToString;
    // Initializes and register a grammar object and all of the rules. 
    // Sets names for all of the rules from the name of the field it is associated with combined with the 
    // name of the grammar. Each rule is stored in Myna.rules and each grammar is stored in Myna.grammars. 
    function registerGrammar(grammarName, grammar) {
        for (var k in grammar) {
            if (grammar[k] instanceof Rule) {
                var rule = grammar[k];
                rule.setName(grammarName, k);
                Myna.allRules[rule.fullName] = rule;
            }
        }
        Myna.grammars[grammarName] = grammar;
        return grammar;
    }
    Myna.registerGrammar = registerGrammar;
    //===========================================================================
    // Utility functions
    function escapeChars(text) {
        var r = JSON.stringify(text);
        return r.slice(1, r.length - 1);
    }
    Myna.escapeChars = escapeChars;
    //===========================================================================
    // Initialization
    // The entire module is a grammar because it is an object that exposes rules as properties
    registerGrammar("core", Myna);
})(Myna || (Myna = {}));
if (typeof module === "object" && module.exports)
    module.exports = Myna;
//# sourceMappingURL=myna.js.map