// tools/contacts.js
import fs from "fs";
const CONTACTS_FILE = "./data/contacts.json";

export function getContacts() {
  if (!fs.existsSync(CONTACTS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf-8"));
}

export function saveContacts(contacts) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

export function addContact(name, address) {
  if (!name || !address) {
    throw new Error('Name and address are required');
  }
  if (typeof name !== 'string' || typeof address !== 'string') {
    throw new Error('Name and address must be strings');
  }
  
  const contacts = getContacts();
  contacts[name.toLowerCase()] = address;
  saveContacts(contacts);
  return { success: true, message: `Added ${name} → ${address}` };
}

export function getContact(name) {
  const contacts = getContacts();
  return contacts[name.toLowerCase()] || null;
}

export function removeContact(name) {
  if (!name) {
    throw new Error('Contact name is required');
  }
  
  const contacts = getContacts();
  if (!contacts[name.toLowerCase()]) {
    throw new Error(`Contact ${name} not found`);
  }
  
  delete contacts[name.toLowerCase()];
  saveContacts(contacts);
  return { success: true, message: `Removed ${name}` };
}
