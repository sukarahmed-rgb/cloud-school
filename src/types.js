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
 * @property {string} title
 * @property {string} details
 * @property {'submission'|'achievement'|'info'} type
 * @property {string} time
 * @property {boolean} read
 */

/**
 * @typedef {Object} UserSession
 * @property {string} name
 * @property {string} contact
 * @property {string} [email]
 * @property {string} [parentContact]
 * @property {string} [childContact]
 * @property {number} [age]
 * @property {'student'|'teacher'|'admin'|'parent'} role
 * @property {string} [uid]
 * @property {string} [id]
 * @property {string} [serverId]
 * @property {boolean} [serverAuth]
 */

/**
 * @typedef {Object} LocalData
 * @property {Book[]} books
 * @property {Assignment[]} assignments
 * @property {Submission[]} submissions
 * @property {Notification[]} notifications
 * @property {Student[]} students
 * @property {{ gameType: string, score: number, date: string }[]} [gameProgress]
 */

export {};
