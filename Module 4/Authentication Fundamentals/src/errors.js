class ApplicationError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class EmailConflictError extends ApplicationError {
  constructor() {
    super(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    this.name = 'EmailConflictError';
  }
}

module.exports = { ApplicationError, EmailConflictError };
