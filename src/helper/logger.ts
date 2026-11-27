export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG"

// ponytail: basic stdlib console logger. upgrade to pino/winston when persistent file transport or json streaming needed.
function write(level: LogLevel, tag: string, message: string, ...rest: unknown[]) {
    const timestamp = new Date().toISOString()
    const line = `${timestamp} [${level}] [${tag}] ${message}`

    if (level === "ERROR") {
        console.error(line, ...rest)
    } else if (level === "WARN") {
        console.warn(line, ...rest)
    } else {
        console.log(line, ...rest)
    }
}

export const logger = {
    info: (tag: string, message: string, ...rest: unknown[]) => write("INFO", tag, message, ...rest),
    warn: (tag: string, message: string, ...rest: unknown[]) => write("WARN", tag, message, ...rest),
    error: (tag: string, message: string, ...rest: unknown[]) => write("ERROR", tag, message, ...rest),
    debug: (tag: string, message: string, ...rest: unknown[]) => {
        if (process.env.DEBUG === "true") {
            write("DEBUG", tag, message, ...rest)
        }
    }
}

export const log = logger
