CREATE TYPE "public"."card_event_type" AS ENUM('card.created', 'card.stage_changed', 'card.pipeline_changed');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('instagram', 'facebook', 'whatsapp', 'tiktok', 'x', 'mercadolivre', 'web');--> statement-breakpoint
CREATE TYPE "public"."intent" AS ENUM('duvida', 'intencao_de_compra', 'elogio', 'reclamacao', 'suporte', 'spam');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('new', 'active', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_unique" UNIQUE("email"),
	CONSTRAINT "contacts_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"type" "stage_type" NOT NULL,
	"wip_limit" integer DEFAULT 0 NOT NULL,
	"accent" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"title" text NOT NULL,
	"value_cents" integer DEFAULT 0 NOT NULL,
	"channel" "channel" NOT NULL,
	"intent" "intent",
	"tags" text[] DEFAULT '{}' NOT NULL,
	"assigned_to" text,
	"entered_stage_at" timestamp with time zone DEFAULT now() NOT NULL,
	"position" integer NOT NULL,
	"custom" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"type" "card_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"seq" bigserial NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_single_default_idx" ON "pipelines" USING btree ("is_default") WHERE is_default;--> statement-breakpoint
CREATE INDEX "stages_pipeline_position_idx" ON "stages" USING btree ("pipeline_id","position");--> statement-breakpoint
CREATE INDEX "cards_stage_position_idx" ON "cards" USING btree ("stage_id","position");--> statement-breakpoint
CREATE INDEX "cards_pipeline_idx" ON "cards" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "cards_contact_idx" ON "cards" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "card_events_card_seq_idx" ON "card_events" USING btree ("card_id","seq");