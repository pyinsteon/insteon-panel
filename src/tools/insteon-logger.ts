export class InsteonLogger {
  prefix: string;

  constructor(name?: string) {
    if (name) {
      this.prefix = `[insteon.${name}]`;
    } else {
      this.prefix = `[insteon]`;
    }
  }

  public info(content: string | unknown) {
    this.log(content);
  }

  public log(content: string | unknown) {
    // eslint-disable-next-line no-console
    console.log(this.prefix, content);
  }

  public debug(content: string | unknown) {
    // eslint-disable-next-line no-console
    console.debug(this.prefix, content);
  }

  public warn(content: string | unknown) {
    // eslint-disable-next-line no-console
    console.warn(this.prefix, content);
  }

  public error(content: string | unknown) {
    // eslint-disable-next-line no-console
    console.error(this.prefix, content);
  }
}
