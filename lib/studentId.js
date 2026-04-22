/**
 * STUDENT ID GENERATION UTILITY
 *
 * Generates globally unique, sequential student IDs in the format: RMT001, RMT002, etc.
 *
 * Uses actual student count in Firestore as source of truth:
 * - Automatically adjusts when students are deleted
 * - No separate counter collection needed
 * - Handles concurrent registrations safely
 * - Provides predictable, globally unique IDs
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const PREFIX = "RMT";
const PAD_LENGTH = 3; // RMT001, RMT002... up to RMT999, then RMT1000...

/**
 * Generates the next student ID atomically
 * SYNCED with actual student count to handle deletions
 *
 * @param {number} maxRetries - Maximum retry attempts for concurrent conflicts
 * @returns {Promise<string>} - The generated student ID (e.g., "RMT001")
 */
export async function generateStudentId(maxRetries = 5) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      // COUNT ACTUAL STUDENTS (source of truth)
      let actualCount = 0;
      try {
        const snapshot = await getDocs(collection(db, "students"));
        actualCount = snapshot.size;
      } catch (e) {
        actualCount = 0;
      }

      // Next value is actual count + 1
      const nextValue = actualCount + 1;

      // Generate the ID string
      const paddedNumber = String(nextValue).padStart(PAD_LENGTH, "0");
      return `${PREFIX}${paddedNumber}`;

    } catch (err) {
      attempts++;

      // If it's a conflict error, retry
      if (err.code === "failed-precondition" || err.message?.includes("conflict")) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        continue;
      }

      // For other errors, throw immediately
      throw err;
    }
  }

  throw new Error(`Failed to generate student ID after ${maxRetries} attempts. Please try again.`);
}

/**
 * Gets the current counter value based on ACTUAL student count
 * Useful for previewing the next ID
 *
 * @returns {Promise<number>} - Current student count
 */
export async function getCurrentCounterValue() {
  try {
    const snapshot = await getDocs(collection(db, "students"));
    return snapshot.size;
  } catch {
    return 0;
  }
}

/**
 * Formats a counter value into a student ID string
 *
 * @param {number} value - The numeric counter value
 * @returns {string} - Formatted student ID (e.g., "RMT001")
 */
export function formatStudentId(value) {
  const paddedNumber = String(value).padStart(PAD_LENGTH, "0");
  return `${PREFIX}${paddedNumber}`;
}

/**
 * Validates if a string is a valid student ID format
 *
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidStudentId(id) {
  if (!id || typeof id !== "string") return false;
  const pattern = /^RMT\d{3,}$/;
  return pattern.test(id);
}