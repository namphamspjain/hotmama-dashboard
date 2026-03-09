export interface AppUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  avatar: string;
}

export const appUsers: AppUser[] = [
  {
    id: "user-1",
    email: "jhedzcartas@gmail.com",
    password: "jdzelevatech2026!",
    name: "Jedidiah J. Cartas",
    role: "admin",
    avatar: "/User1.png",
  },
  {
    id: "user-2",
    email: "ijuanitocartas@gmail.com",
    password: "jdzelevatech2026!",
    name: "Iran M. Cartas",
    role: "admin",
    avatar: "/User2.jpeg",
  },
  {
    id: "user-3",
    email: "amiraharandia10@gmail.com",
    password: "jdzelevatech2026!",
    name: "Meg Bae",
    role: "admin",
    avatar: "/User3.jpeg",
  },
];
