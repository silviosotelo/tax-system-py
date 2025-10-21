export interface User {
  id: string;
  email: string;
  password_hash: string;
  ruc: string;
  dv: string;
  full_name: string;
  business_name?: string;
  phone?: string;
  address?: string;
  activity_type: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface UserCreateDTO {
  email: string;
  password: string;
  ruc: string;
  dv: string;
  full_name: string;
  business_name?: string;
  phone?: string;
  address?: string;
  activity_type?: string;
}

export interface UserUpdateDTO {
  email?: string;
  password?: string;
  full_name?: string;
  business_name?: string;
  phone?: string;
  address?: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}
