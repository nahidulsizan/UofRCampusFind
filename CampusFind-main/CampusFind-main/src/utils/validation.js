'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+.\-]{10,25}$/;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(cleanString(value).toLowerCase());
}

function isValidPhone(value) {
  const phone = cleanString(value);
  return PHONE_PATTERN.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

module.exports = { cleanString, isValidEmail, isValidPhone, isValidDate };
