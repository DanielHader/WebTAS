export enum LogLevel {
    Debug   = 1,
    Info    = 10,
    Warning = 100,
    Error   = 1000,
}

class LogEntry {
    level: LogLevel;
    message: string;
    date: Date;

    public constructor(level: LogLevel, message: string) {
        this.level = level;
        this.message = message;
        this.date = new Date();
    }

    public dateString() : string {
        const timeStr = `${String(this.date.getHours()).padStart(2,0)}:${String(this.date.getMinutes()).padStart(2,0)}:${String(this.date.getSeconds()).padStart(2,0)}`;
	const dateStr = `${String(this.date.getDay()).padStart(2,0)}/${String(this.date.getMonth()).padStart(2,0)}/${this.date.getFullYear()}`;
        return timeStr + "  " + dateStr;
    }

    public levelString() : string {
        switch (this.level) {
            case LogLevel.Debug:
                return "Debug";
            case LogLevel.Info:
                return "Info";
            case LogLevel.Warning:
                return "Warning";
            case LogLevel.Error:
                return "Error";
        }
    }
}

const logEntries = $state<LogEntry[]>([]);

function log(level: LogLevel, message: string) {
    logEntries.push(new LogEntry(level, message));
}

export function getEntries() {
    return logEntries;
}

export function info(message: string)    { log(LogLevel.Info, message);    }
export function debug(message: string)   { log(LogLevel.Debug, message);   }
export function warning(message: string) { log(LogLevel.Warning, message); }
export function error(message: string)   { log(LogLevel.Error, message);   }
