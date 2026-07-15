-- Alcance: tablas espejo de Dexie para sync opcional (Fase 5).
-- Correr una sola vez en Supabase → SQL Editor → New query → pegar todo → Run.
--
-- Sin login (app personal de un solo usuario): RLS habilitado pero con
-- política permisiva para el rol "anon" (la app usa la anon key, nunca
-- la service_role). Si en el futuro se agrega login real, reemplazar
-- estas políticas por unas que filtren por auth.uid().

create table if not exists settings (
  id integer primary key,
  umbral_hormiga_usd_centavos bigint not null,
  tasa_preferida text not null,
  tasa_manual_x10000 bigint not null,
  fechas_de_cobro integer[] not null,
  moneda_display text not null,
  cuenta_default_id integer,
  moneda_registro_default text not null,
  hora_notificacion_diaria text not null,
  notificaciones_activas boolean not null default false,
  modo_bajo_estimulo boolean not null,
  bloqueo_biometrico_activo boolean not null default false
);

create table if not exists accounts (
  id integer primary key,
  nombre text not null,
  tipo text not null,
  moneda text not null,
  balance_actual_centavos bigint not null,
  activa boolean not null
);

create table if not exists categories (
  id integer primary key,
  nombre text not null,
  tipo text not null,
  icono text not null,
  color text not null,
  es_favorita boolean not null
);

create table if not exists transactions (
  id integer primary key,
  monto_centavos bigint not null,
  moneda text not null,
  tasa_cambio_al_momento_x10000 bigint,
  fuente_tasa text,
  monto_usd_centavos bigint not null,
  cuenta_origen_id integer,
  cuenta_destino_id integer,
  categoria_id integer,
  es_hormiga boolean not null,
  fecha text not null,
  nota text not null,
  recurrente_id integer
);

create table if not exists exchange_rates_cache (
  id integer primary key,
  fecha text not null,
  tasa_bcv_x10000 bigint,
  tasa_paralelo_x10000 bigint,
  tasa_binance_x10000 bigint,
  timestamp_consulta bigint not null
);

create table if not exists debts (
  id integer primary key,
  descripcion text not null,
  acreedor text not null,
  monto_centavos bigint not null,
  moneda text not null,
  fecha_limite text,
  estado text not null,
  transaction_id integer
);

create table if not exists payday_plans (
  id integer primary key,
  fecha_cobro text not null,
  monto_total_centavos bigint not null,
  moneda_cobro text not null,
  monto_usd_centavos bigint not null,
  total_deudas_pagadas_centavos bigint not null,
  monto_protegido_centavos bigint not null,
  monto_para_vivir_centavos bigint not null,
  num_semanas integer not null,
  notas text not null
);

create table if not exists weekly_envelopes (
  id integer primary key,
  payday_plan_id integer,
  semana_numero integer not null,
  fecha_inicio text not null,
  fecha_fin text not null,
  monto_asignado_usd_centavos bigint not null
);

create table if not exists recurring_transactions (
  id integer primary key,
  descripcion text not null,
  monto_centavos bigint not null,
  moneda text not null,
  categoria_id integer,
  cuenta_id integer,
  frecuencia text not null,
  dia_del_periodo integer not null,
  activa boolean not null,
  ultima_generada text
);

alter table settings enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table exchange_rates_cache enable row level security;
alter table debts enable row level security;
alter table payday_plans enable row level security;
alter table weekly_envelopes enable row level security;
alter table recurring_transactions enable row level security;

create policy "anon_all" on settings for all to anon using (true) with check (true);
create policy "anon_all" on accounts for all to anon using (true) with check (true);
create policy "anon_all" on categories for all to anon using (true) with check (true);
create policy "anon_all" on transactions for all to anon using (true) with check (true);
create policy "anon_all" on exchange_rates_cache for all to anon using (true) with check (true);
create policy "anon_all" on debts for all to anon using (true) with check (true);
create policy "anon_all" on payday_plans for all to anon using (true) with check (true);
create policy "anon_all" on weekly_envelopes for all to anon using (true) with check (true);
create policy "anon_all" on recurring_transactions for all to anon using (true) with check (true);
