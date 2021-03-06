"use strict";

// Implements a grammar for the Git-flavor of Markdown
// https://daringfireball.net/projects/markdown/syntax#autolink 
// https://help.github.com/articles/basic-writing-and-formatting-syntax/
// https://guides.github.com/features/mastering-markdown/

function MarkdownGrammar(myna)
{
    let m = myna;

    let _this = this;
    
    // Allows the "inline" to be referenced before it is defined. 
    // This enables recursive definitions. 
    this.inlineDelayed = m.delay(function() { return _this.inline; });            
    
    this.boundedInline = function(begin, end) {
        if (end == undefined) end = begin;
        return m.seq(begin, this.inlineDelayed.butNot(end).zeroOrMore, end);
    }
    
    // Plain text
    this.specialCharSet = '[]()*~`@#\\_!';
    this.escaped = m.seq('\\', m.char(this.specialCharSet)).ast;
    this.ws = m.char(' \t').oneOrMore;
    this.optWs = this.ws.opt;
    this.nonSpecialChar = m.charExcept(this.specialCharSet).butNot(m.newLine);
    this.specialChar = m.char(this.specialCharSet).ast;
    this.plainText = m.choice(m.digits, m.letters, this.ws, this.nonSpecialChar).oneOrMore.ast;

    // Styling instructions 
    this.bold = m.choice(this.boundedInline('**'), this.boundedInline('__')).ast;
    this.boldItalic = m.choice(this.boundedInline('*_', '_*'), this.boundedInline('_*', '*_')).ast;
    this.italic = m.choice(this.boundedInline('*'), this.boundedInline('_')).ast;
    this.strike = this.boundedInline('~~').ast;
    this.code = this.boundedInline('`').ast;
    this.styledText = m.choice(this.bold, this.italic, this.strike, this.code);

    // Image instructions 
    this.url = m.choice(this.escaped, m.charExcept(')')).zeroOrMore.ast;
    this.altText =  m.choice(this.escaped, m.charExcept(']')).zeroOrMore.ast;
    this.image = m.seq('![', this.altText, ']', m.ws, '(', this.url, ')').ast;

    // Linked text
    this.linkedText = this.inlineDelayed.butNot(']').zeroOrMore.ast;
    this.linkText = m.seq('[', this.linkedText, ']');
    this.linkUrl = m.seq('(', this.url, ')');
    this.link = m.seq(this.linkText, m.ws, this.linkUrl).ast;        

    // Mention
    this.reference = m.choice(m.char('/-'), m.identifierNext).oneOrMore.ast;
    this.mention = m.seq('@').then(this.reference).ast;    

    // Comment
    this.comment = m.seq("<!--", m.advanceUntilPast("-->")).ast;

    // Beginning of sections 
    this.indent = m.zeroOrMore('  ').ast;
    this.numListStart = m.seq(this.indent, m.digit.oneOrMore, '.');
    this.quotedLineStart = m.seq(this.indent, '>');
    this.listStart = m.seq(this.indent, m.char('*-'), m.ws);
    this.headingLineStart = m.bounded('#', 1, 6).ast;
    this.specialLineStart = m.choice(this.listStart, this.headingLineStart, this.quotedLineStart, this.numListStart);

    // Inline content 
    this.any = m.advance.ast;
    this.inline = m.choice(this.comment, this.image, this.link, this.mention, this.styledText, this.escaped, this.plainText, this.any);
    this.restOfLine = m.seq(this.inline.butNot(m.newLine).zeroOrMore, m.newLine.opt).ast;
    this.simpleLine = m.seq(m.not(this.specialLineStart), this.restOfLine).ast;
    this.paragraph = this.simpleLine.butNot(m.end).oneOrMore.ast;
    
    // Lists 
    this.numberedListItem = m.seq(this.numListStart, this.optWs, this.restOfLine).ast;
    this.unorderedListItem = m.seq(this.listStart, this.optWs, this.restOfLine).ast;
    this.list = m.choice(this.numberedListItem, this.unorderedListItem).oneOrMore.ast;
    
    // Quotes
    this.quotedLine = m.seq('>', this.optWs, this.restOfLine).ast;
    this.quote = this.quotedLine.oneOrMore.ast;    

    // Code blocks
    this.codeBlockContent = m.advanceUnless("```").zeroOrMore.ast;
    this.codeBlockHint = m.advanceWhileNot(m.newLine).ast;
    this.codeBlock = m.guardedSeq("```", this.optWs, this.codeBlockHint, m.newLine.opt, this.codeBlockContent, "```").ast;

    // Heading 
    this.heading = this.headingLineStart.then(this.optWs).then(this.restOfLine).ast;

    // A section 
    this.content = m.choice(this.heading, this.list, this.quote, this.codeBlock, this.paragraph); 
    this.document = this.content.zeroOrMore;
}

// Export the grammar for usage by Node.js and CommonJs compatible module loaders 
if (typeof module === "object" && module.exports) 
    module.exports = MarkdownGrammar;