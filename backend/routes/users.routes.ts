import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

export type UserRole =
  | "admin"
  | "gestor360"
  | "estrategico"
  | "artefatos"
  | "eventos";

export type UserStatus = "ativo" | "inativo";

export interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastAccess?: string;
}

function readUsers(): User[] {
  try {
    if (!fs.existsSync(usersFilePath)) {
      return [];
    }
    const data = fs.readFileSync(usersFilePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users", err);
    return [];
  }
}

function writeUsers(users: User[]) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf8");
}

router.get("/", (req, res) => {
  const users = readUsers();
  res.json(users);
});

router.post("/", (req, res) => {
  const { name, nickname, email, role, status } = req.body;
  if (!name || !email || !role || !status) {
    return res.status(400).json({ error: "Nome, e-mail, perfil e status são obrigatórios." });
  }

  const users = readUsers();
  if (users.find((u: User) => u.email === email)) {
    return res.status(400).json({ error: "E-mail já está em uso." });
  }

  const newUser = {
    id: Math.random().toString(36).substring(2, 10),
    name,
    nickname,
    email,
    role,
    status,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json(newUser);
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, nickname, email, role, status, lastAccess } = req.body;
  const users = readUsers();
  const index = users.findIndex((u: User) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  if (email && email !== users[index].email) {
    if (users.find((u: User) => u.email === email && u.id !== id)) {
      return res.status(400).json({ error: "E-mail já está em uso por outro usuário." });
    }
  }

  users[index] = {
    ...users[index],
    name: name || users[index].name,
    nickname: nickname !== undefined ? nickname : users[index].nickname,
    email: email || users[index].email,
    role: role || users[index].role,
    status: status || users[index].status,
    updatedAt: new Date().toISOString(),
    lastAccess: lastAccess || users[index].lastAccess
  };

  writeUsers(users);
  res.json(users[index]);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const users = readUsers();
  const index = users.findIndex((u: User) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  users.splice(index, 1);
  writeUsers(users);

  res.json({ message: "Usuário deletado." });
});

export default router;
