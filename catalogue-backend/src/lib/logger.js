/* This script provides a simple logging utility that outputs log messages in JSON format to the console. 
It supports three log levels: info, warn, and error. Each log entry includes a timestamp, the log level, the message...
... and any additional metadata provided */

// Write a log entry to the console in JSON format
function write(level, message, metadata = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...metadata,
    };

    const output = JSON.stringify(entry);
    
    if (level === 'error') console.error(output);
    else console.log(output);
}

// Export the logger object with methods for each log level
export const logger = {
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata),
};
