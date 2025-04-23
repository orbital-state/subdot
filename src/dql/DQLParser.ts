// DQLParser.ts
import { createToken, Lexer, CstParser, ParserMethod, CstNode, IToken } from 'chevrotain';

// --------------------
// 1. Tokens
// --------------------
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
const Url = createToken({ name: 'Url', pattern: /Url\b/ });
const Filter = createToken({ name: 'Filter', pattern: /filter|when/ });
const Project = createToken({ name: 'Project', pattern: /project|select/ });
const Do = createToken({ name: 'Do', pattern: /do|action/ });
const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /".*?"/ });
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });
const JsonataChunk = createToken({ name: 'JsonataChunk', pattern: /[^|\s]+/, line_breaks: false });

const allTokens = [
    WhiteSpace, Url, Filter, Project, Do, Pipe, LParen, RParen,
    Comma, StringLiteral, Identifier, JsonataChunk
];

export const DQLLexer = new Lexer(allTokens);

// --------------------
// 2. Parser
// --------------------
class DQLParser extends CstParser {
    public dql!: ParserMethod<[], CstNode>;
    public source!: ParserMethod<[], CstNode>;
    public actionBlock!: ParserMethod<[], CstNode>;
    public filterBlock!: ParserMethod<[], CstNode>;
    public projectBlock!: ParserMethod<[], CstNode>;
    public doBlock!: ParserMethod<[], CstNode>;
    public handlerList!: ParserMethod<[], CstNode>;
    public handler!: ParserMethod<[], CstNode>;
    public jsonataExpr!: ParserMethod<[], CstNode>;

    constructor() {
        super(allTokens, { outputCst: true } as any);
        const $ = this;

        $.RULE('dql', () => {
            $.SUBRULE($.source);
            $.AT_LEAST_ONE(() => {
                $.CONSUME(Pipe);
                $.SUBRULE($.actionBlock);
            });
        });

        $.RULE('source', () => {
            $.CONSUME(Url);
            $.CONSUME(LParen);
            $.CONSUME(StringLiteral);
            $.CONSUME(RParen);
        });

        $.RULE('actionBlock', () => {
            $.OR([
                { ALT: () => $.SUBRULE($.filterBlock) },
                { ALT: () => $.SUBRULE($.projectBlock) },
                { ALT: () => $.SUBRULE($.doBlock) }
            ]);
        });

        $.RULE('filterBlock', () => {
            $.CONSUME(Filter);
            $.SUBRULE($.jsonataExpr);
        });

        $.RULE('projectBlock', () => {
            $.CONSUME(Project);
            $.SUBRULE($.jsonataExpr);
        });

        $.RULE('doBlock', () => {
            $.CONSUME(Do);
            $.SUBRULE($.handlerList);
        });

        $.RULE('handlerList', () => {
            $.SUBRULE($.handler);
            $.MANY(() => {
                $.CONSUME(Comma);
                $.SUBRULE2($.handler);
            });
        });

        $.RULE('handler', () => {
            $.CONSUME(Identifier);
            $.CONSUME(LParen);
            $.CONSUME(StringLiteral);
            $.CONSUME(RParen);
        });

        $.RULE('jsonataExpr', () => {
            const tokens: IToken[] = [];
            $.MANY(() => {
                $.OR(
                    allTokens
                      .filter(tokenType => tokenType !== Pipe)
                      .map(tokenType => ({
                          ALT: () => { tokens.push($.CONSUME(tokenType)); }
                      }))
                );
            });
            return this.CST_NODE({ name: 'jsonataExpr', children: { tokens } });
        });

        this.performSelfAnalysis();
    }

    private CST_NODE(options: { name: string, children: { tokens: IToken[] } }): CstNode {
        return {
            name: options.name,
            children: options.children
        };
    }
}

export const parseDQL = (dql: string) => {
    const lexResult = DQLLexer.tokenize(dql);
    const parser = new DQLParser();
    parser.input = lexResult.tokens;
    const cst = parser.dql();
    return { cst, tokens: lexResult.tokens, text: dql };
};

export const parseDQLWithErrorHandling = (dql: string) => {
    // console.log('Parsing DQL:', dql);

    const lexResult = DQLLexer.tokenize(dql);
    if (lexResult.errors.length > 0) {
        console.error('Lexer errors detected:', lexResult.errors);
        return null;
    }

    const parser = new DQLParser();
    parser.input = lexResult.tokens;
    const cst = parser.dql();

    if (parser.errors.length > 0) {
        console.error('Parser errors detected:', parser.errors);
        return null;
    }

    // console.log('Parsing CST result:', cst);
    return { cst, tokens: lexResult.tokens, text: dql };
};