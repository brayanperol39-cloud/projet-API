import { Request, Response } from "express";
import * as usersService from "../services/users.service";
import { parseId } from "../utils/parseId";

export async function createAdmin(req: Request, res: Response) {
  res.status(201).json(await usersService.createUser(req.body.email, "ADMIN"));
}

export async function createUser(req: Request, res: Response) {
  res.status(201).json(await usersService.createUser(req.body.email, "USER"));
}

export async function list(_req: Request, res: Response) {
  res.json(await usersService.listUsers());
}

export async function getOne(req: Request, res: Response) {
  res.json(await usersService.getUser(parseId(req.params.id)));
}

export async function update(req: Request, res: Response) {
  res.json(await usersService.updateUser(req.user!, parseId(req.params.id), req.body));
}

export async function disable(req: Request, res: Response) {
  await usersService.disableUser(req.user!, parseId(req.params.id));
  res.json({ message: "Compte désactivé, sessions coupées" });
}

export async function enable(req: Request, res: Response) {
  await usersService.enableUser(req.user!, parseId(req.params.id));
  res.json({ message: "Compte réactivé" });
}
