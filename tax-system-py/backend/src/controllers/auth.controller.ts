import { Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { AuthRequest, generateToken } from '../middleware/auth.middleware';
import { UserCreateDTO, UserLoginDTO } from '../models/User';
import logger from '../utils/logger';

export class AuthController {
  constructor(private db: Pool) {}

  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userData: UserCreateDTO = req.body;

      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE email = $1 OR ruc = $2',
        [userData.email, userData.ruc]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ error: 'Email o RUC ya registrado' });
        return;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const query = `
        INSERT INTO users (
          email, password_hash, ruc, dv, full_name, 
          business_name, phone, address, activity_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, email, ruc, dv, full_name, created_at
      `;

      const result = await this.db.query(query, [
        userData.email,
        passwordHash,
        userData.ruc,
        userData.dv,
        userData.full_name,
        userData.business_name || null,
        userData.phone || null,
        userData.address || null,
        userData.activity_type || 'SERVICIOS_PROFESIONALES'
      ]);

      const user = result.rows[0];
      const token = generateToken(user.id, user.email);

      await this.db.query(
        'INSERT INTO system_settings (user_id) VALUES ($1)',
        [user.id]
      );

      logger.info(`Nuevo usuario registrado: ${user.email}`);

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user,
        token
      });
    } catch (error) {
      logger.error('Error en registro:', error);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password }: UserLoginDTO = req.body;

      const result = await this.db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      await this.db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const token = generateToken(user.id, user.email);

      logger.info(`Usuario autenticado: ${user.email}`);

      res.json({
        message: 'Autenticación exitosa',
        user: {
          id: user.id,
          email: user.email,
          ruc: user.ruc,
          dv: user.dv,
          full_name: user.full_name
        },
        token
      });
    } catch (error) {
      logger.error('Error en login:', error);
      res.status(500).json({ error: 'Error al autenticar' });
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.db.query(
        'SELECT id, email, ruc, dv, full_name, business_name, phone, address, activity_type, created_at FROM users WHERE id = $1',
        [req.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error al obtener perfil:', error);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  }
}
