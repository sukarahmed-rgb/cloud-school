/**
 * @typedef {Object} Book
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string} audio
 */

/**
 * @typedef {Object} QuizOption
 * @property {string} A
 * @property {string} B
 * @property {string} C
 * @property {string} D
 */

/**
 * @typedef {Object} Assignment
 * @property {string} id
 * @property {string} title
 * @property {'mcq'|'text'} type
 * @property {string} [question]
 * @property {QuizOption} [options]
 * @property {string} [correct]
 * @property {string} [ideal]
 */

/**
 * @typedef {Object} Submission
 * @property {string} studentName
 * @property {string} studentContact
 * @property {string} parentContact
 * @property {string} quizId
 * @property {string} quizTitle
 * @property {string} studentAnswer
 * @property {number} initialScore
 * @property {string} graderFeedback
 * @property {string} timestamp
 */

/**
 * @typedef {Object} Student
 * @property {string} name
 * @property {string} grade
 * @property {string} pin
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} title
 * @property {string} message
 * @property {'submission'|'achievement'|'info'} type
 * @property {string} timestamp
 * @property {boolean} read
 */

/**
 * @typedef {Object} UserSession
 * @property {string} name
 * @property {string} contact
 * @property {string} [parentContact]
 * @property {number} [age]
 * @property {'student'|'teacher'|'admin'|'parent'} role
 * @property {string} [uid]
 */

/**
 * @typedef {Object} LocalData
 * @property {Book[]} books
 * @property {Assignment[]} assignments
 * @property {Submission[]} submissions
 * @property {Notification[]} notifications
 * @property {Student[]} students
 */

export {};
