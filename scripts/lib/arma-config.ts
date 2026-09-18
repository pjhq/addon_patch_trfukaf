export interface ConfigClass {
  name: string;
  parent?: string;
  line: number;
  declared: boolean;
  classes: ConfigClass[];
  properties: Map<string, ConfigToken[]>;
}

export interface ConfigToken {
  kind: "identifier" | "number" | "string" | "symbol";
  value: string;
  line: number;
}

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_$]/.test(character);
}

function isIdentifierPart(character: string): boolean {
  return /[A-Za-z0-9_$]/.test(character);
}

export function tokenizeConfig(source: string): ConfigToken[] {
  const tokens: ConfigToken[] = [];
  let index = 0;
  let line = 1;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (character === undefined) {
      break;
    }

    if (character === "\n") {
      line += 1;
      index += 1;
      continue;
    }
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "#") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      let closed = false;
      while (index < source.length) {
        if (source[index] === "\n") {
          line += 1;
        }
        if (source[index] === "*" && source[index + 1] === "/") {
          index += 2;
          closed = true;
          break;
        }
        index += 1;
      }
      if (!closed) {
        throw new Error(`Unterminated block comment at line ${line}`);
      }
      continue;
    }
    if (character === '"') {
      const startLine = line;
      let value = "";
      let closed = false;
      index += 1;
      while (index < source.length) {
        const stringCharacter = source[index];
        if (stringCharacter === "\n") {
          line += 1;
        }
        if (stringCharacter === '"') {
          if (source[index + 1] === '"') {
            value += '"';
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        value += stringCharacter;
        index += 1;
      }
      if (!closed) {
        throw new Error(`Unterminated string at line ${startLine}`);
      }
      tokens.push({ kind: "string", value, line: startLine });
      continue;
    }
    if (isIdentifierStart(character)) {
      const start = index;
      index += 1;
      while (index < source.length && isIdentifierPart(source[index] ?? "")) {
        index += 1;
      }
      tokens.push({ kind: "identifier", value: source.slice(start, index), line });
      continue;
    }
    if (/\d/.test(character) || ((character === "-" || character === "+") && /\d/.test(next ?? ""))) {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9.eE+-]/.test(source[index] ?? "")) {
        index += 1;
      }
      tokens.push({ kind: "number", value: source.slice(start, index), line });
      continue;
    }

    tokens.push({ kind: "symbol", value: character, line });
    index += 1;
  }

  return tokens;
}

class ConfigParser {
  private index = 0;

  constructor(private readonly tokens: ConfigToken[]) {}

  parse(): ConfigClass[] {
    const classes: ConfigClass[] = [];
    while (this.index < this.tokens.length) {
      if (this.current()?.value.toLowerCase() === "class") {
        const parsed = this.parseClass();
        if (parsed) {
          classes.push(parsed);
          continue;
        }
      }
      this.index += 1;
    }
    return classes;
  }

  private current(): ConfigToken | undefined {
    return this.tokens[this.index];
  }

  private parseClass(): ConfigClass | undefined {
    const classToken = this.tokens[this.index];
    const nameToken = this.tokens[this.index + 1];
    if (!classToken || nameToken?.kind !== "identifier") {
      return undefined;
    }

    this.index += 2;
    let parent: string | undefined;
    if (this.current()?.value === ":") {
      this.index += 1;
      const parentToken = this.current();
      if (parentToken?.kind !== "identifier") {
        throw new Error(`Expected parent class for ${nameToken.value} at line ${nameToken.line}`);
      }
      parent = parentToken.value;
      this.index += 1;
    }

    if (this.current()?.value === ";") {
      this.index += 1;
      return {
        name: nameToken.value,
        parent,
        line: classToken.line,
        declared: false,
        classes: [],
        properties: new Map()
      };
    }
    if (this.current()?.value !== "{") {
      return undefined;
    }

    this.index += 1;
    const classes: ConfigClass[] = [];
    const properties = new Map<string, ConfigToken[]>();
    while (this.index < this.tokens.length && this.current()?.value !== "}") {
      if (this.current()?.value.toLowerCase() === "class") {
        const child = this.parseClass();
        if (child) {
          classes.push(child);
          continue;
        }
      }
      if (this.parseProperty(properties)) {
        continue;
      }
      this.skipStatement();
    }

    if (this.current()?.value !== "}") {
      throw new Error(`Unterminated class ${nameToken.value} at line ${nameToken.line}`);
    }
    this.index += 1;
    if (this.current()?.value === ";") {
      this.index += 1;
    }

    return {
      name: nameToken.value,
      parent,
      line: classToken.line,
      declared: true,
      classes,
      properties
    };
  }

  private parseProperty(properties: Map<string, ConfigToken[]>): boolean {
    const name = this.current();
    if (name?.kind !== "identifier") {
      return false;
    }

    let cursor = this.index + 1;
    if (this.tokens[cursor]?.value === "[" && this.tokens[cursor + 1]?.value === "]") {
      cursor += 2;
    }
    if (!["=", "+=", "-="].includes(this.tokens[cursor]?.value ?? "")) {
      if (["+", "-"].includes(this.tokens[cursor]?.value ?? "") && this.tokens[cursor + 1]?.value === "=") {
        cursor += 1;
      } else {
        return false;
      }
    }

    cursor += 1;
    const value: ConfigToken[] = [];
    const depths = { braces: 0, brackets: 0, parentheses: 0 };
    while (cursor < this.tokens.length) {
      const token = this.tokens[cursor];
      if (!token) {
        break;
      }
      if (token.value === ";" && depths.braces === 0 && depths.brackets === 0 && depths.parentheses === 0) {
        properties.set(name.value.toLowerCase(), value);
        this.index = cursor + 1;
        return true;
      }
      if (token.value === "{") depths.braces += 1;
      if (token.value === "}") {
        if (depths.braces === 0) {
          return false;
        }
        depths.braces -= 1;
      }
      if (token.value === "[") depths.brackets += 1;
      if (token.value === "]") depths.brackets -= 1;
      if (token.value === "(") depths.parentheses += 1;
      if (token.value === ")") depths.parentheses -= 1;
      value.push(token);
      cursor += 1;
    }
    return false;
  }

  private skipStatement(): void {
    let depth = 0;
    while (this.index < this.tokens.length) {
      const value = this.current()?.value;
      if (value === "{" || value === "(" || value === "[") depth += 1;
      if (value === "}" || value === ")" || value === "]") {
        if (value === "}" && depth === 0) {
          return;
        }
        depth -= 1;
      }
      this.index += 1;
      if (value === ";" && depth === 0) {
        return;
      }
    }
  }
}

export function parseConfig(source: string): ConfigClass[] {
  return new ConfigParser(tokenizeConfig(source)).parse();
}

export function childClass(configClass: ConfigClass, name: string): ConfigClass | undefined {
  const normalized = name.toLowerCase();
  return configClass.classes.find((candidate) => candidate.name.toLowerCase() === normalized);
}

export function stringProperty(configClass: ConfigClass, name: string): string | undefined {
  const value = configClass.properties.get(name.toLowerCase());
  return value?.length === 1 && value[0]?.kind === "string" ? value[0].value : undefined;
}

export function numberProperty(configClass: ConfigClass, name: string): number | undefined {
  const value = configClass.properties.get(name.toLowerCase());
  if (value?.length !== 1 || value[0]?.kind !== "number") {
    return undefined;
  }
  const parsed = Number(value[0].value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function macroArguments(source: string, macro: string): string[] {
  const tokens = tokenizeConfig(source);
  const normalized = macro.toLowerCase();
  const matches: string[] = [];
  for (let index = 0; index < tokens.length - 3; index += 1) {
    const name = tokens[index];
    const open = tokens[index + 1];
    const argument = tokens[index + 2];
    const close = tokens[index + 3];
    if (name?.kind === "identifier" && name.value.toLowerCase() === normalized && open?.value === "(" && argument?.kind === "identifier" && close?.value === ")") {
      matches.push(argument.value);
    }
  }
  return matches;
}
