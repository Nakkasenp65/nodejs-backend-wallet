
import prisma from "../../../libs/prisma.js";

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/**
 * Service for logging system events and errors.
 */
const create = async (
  module: string,
  message: string,
  level: LogLevel = 'INFO',
  metadata?: any
) => {
  try {
    const metaString = metadata ? JSON.stringify(metadata) : undefined;
    
    await prisma.systemLog.create({
      data: {
        module,
        message,
        level,
        metadata: metaString,
      },
    });
  } catch (error) {
    // If logging fails, we should just print to console to avoid crashing the main application flow
    console.error('[LogService] Failed to create log:', error);
  }
};

const logInfo = (module: string, message: string, metadata?: any) => {
  return create(module, message, 'INFO', metadata);
};

const logWarn = (module: string, message: string, metadata?: any) => {
  return create(module, message, 'WARN', metadata);
};

const logError = (module: string, message: string, metadata?: any) => {
  return create(module, message, 'ERROR', metadata);
};

export default {
  create,
  logInfo,
  logWarn,
  logError,
};
