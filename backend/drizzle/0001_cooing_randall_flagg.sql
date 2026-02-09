CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"input_type" text NOT NULL,
	"input_content" text NOT NULL,
	"domain" text,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"fit_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"persona_analysis" jsonb,
	"requirements_matrix" jsonb,
	"proposal_text" text,
	"refined_proposal_text" text,
	"clarifying_questions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "domain" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "content_chunk" text NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "domain_role" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "timestamp";