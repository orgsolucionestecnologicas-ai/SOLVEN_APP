export class ARCAError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "ARCAError";
  }
}

export class ARCAAuthError extends ARCAError {
  constructor(message: string, code?: string, detail?: string) {
    super(message, code, detail);
    this.name = "ARCAAuthError";
  }
}

export class ARCAEmissionError extends ARCAError {
  constructor(message: string, code?: string, detail?: string) {
    super(message, code, detail);
    this.name = "ARCAEmissionError";
  }
}

export class ARCAConfigError extends ARCAError {
  constructor(message: string) {
    super(message);
    this.name = "ARCAConfigError";
  }
}
