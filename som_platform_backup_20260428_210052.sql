--
-- PostgreSQL database dump
--

\restrict jpCyuGQswOAjhqYZJJ4RkZ0xXahiJG3Wv3puLa24zwSICrriBy4uGtJ3VSRMgyj

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asset_compliance_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_compliance_alerts (
    alert_id character varying(20) NOT NULL,
    asset_code character varying(40) NOT NULL,
    type character varying(50),
    message text,
    days_remaining integer DEFAULT 0,
    severity character varying(20) DEFAULT 'MEDIUM'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asset_compliance_alerts OWNER TO postgres;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    asset_code character varying(40) NOT NULL,
    name character varying(200) NOT NULL,
    region character varying(50) NOT NULL,
    site character varying(100) NOT NULL,
    facility character varying(100) NOT NULL,
    equipment_type character varying(50) NOT NULL,
    department character varying(100),
    status character varying(30) DEFAULT 'Active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Name: capex_budget_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capex_budget_uploads (
    id integer NOT NULL,
    fiscal_year integer NOT NULL,
    filename character varying(255),
    rows_imported integer DEFAULT 0 NOT NULL,
    uploaded_by text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.capex_budget_uploads OWNER TO postgres;

--
-- Name: capex_budget_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.capex_budget_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.capex_budget_uploads_id_seq OWNER TO postgres;

--
-- Name: capex_budget_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.capex_budget_uploads_id_seq OWNED BY public.capex_budget_uploads.id;


--
-- Name: capex_department_monthly; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capex_department_monthly (
    id integer NOT NULL,
    department_id integer NOT NULL,
    month_label character varying(10) NOT NULL,
    budgeted numeric(14,2) DEFAULT 0 NOT NULL,
    actual numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.capex_department_monthly OWNER TO postgres;

--
-- Name: capex_department_monthly_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.capex_department_monthly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.capex_department_monthly_id_seq OWNER TO postgres;

--
-- Name: capex_department_monthly_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.capex_department_monthly_id_seq OWNED BY public.capex_department_monthly.id;


--
-- Name: capex_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capex_departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    total_budget numeric(14,2) DEFAULT 0 NOT NULL,
    committed numeric(14,2) DEFAULT 0 NOT NULL,
    actual numeric(14,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.capex_departments OWNER TO postgres;

--
-- Name: capex_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.capex_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.capex_departments_id_seq OWNER TO postgres;

--
-- Name: capex_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.capex_departments_id_seq OWNED BY public.capex_departments.id;


--
-- Name: capex_initiations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capex_initiations (
    id character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    department character varying(100) NOT NULL,
    initiator character varying(100),
    project_type character varying(50) DEFAULT 'New'::character varying,
    estimated_budget numeric(14,2) NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    status character varying(50) DEFAULT 'Pending Approval'::character varying,
    start_date date,
    end_date date,
    stakeholders text,
    justification text,
    created_by uuid,
    created_at date DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE public.capex_initiations OWNER TO postgres;

--
-- Name: capex_manual_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capex_manual_entries (
    id character varying(30) NOT NULL,
    entry_type character varying(50) NOT NULL,
    department character varying(100) NOT NULL,
    period character varying(20) NOT NULL,
    amount numeric(14,2) NOT NULL,
    description text,
    reference_number character varying(100),
    entered_by character varying(100),
    entered_by_id uuid,
    entered_at date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(30) DEFAULT 'Posted'::character varying
);


ALTER TABLE public.capex_manual_entries OWNER TO postgres;

--
-- Name: gsap_approved_budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gsap_approved_budgets (
    id integer NOT NULL,
    wbs_code character varying(50) NOT NULL,
    description text,
    department character varying(100),
    approved_amount numeric(14,2) DEFAULT 0,
    posted_amount numeric(14,2) DEFAULT 0,
    source character varying(20) DEFAULT 'manual'::character varying,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gsap_approved_budgets OWNER TO postgres;

--
-- Name: gsap_approved_budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gsap_approved_budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gsap_approved_budgets_id_seq OWNER TO postgres;

--
-- Name: gsap_approved_budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gsap_approved_budgets_id_seq OWNED BY public.gsap_approved_budgets.id;


--
-- Name: gsap_sync_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gsap_sync_status (
    id integer DEFAULT 1 NOT NULL,
    mode character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    last_synced timestamp with time zone,
    source character varying(50) DEFAULT 'Manual Entry'::character varying,
    message text DEFAULT 'GSAP connection pending — SAP undergoing maintenance. Using manual entry.'::text
);


ALTER TABLE public.gsap_sync_status OWNER TO postgres;

--
-- Name: kb_chunks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_chunks (
    id integer NOT NULL,
    doc_id character varying(10) NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, content)) STORED,
    embedding jsonb
);


ALTER TABLE public.kb_chunks OWNER TO postgres;

--
-- Name: kb_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kb_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kb_chunks_id_seq OWNER TO postgres;

--
-- Name: kb_chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kb_chunks_id_seq OWNED BY public.kb_chunks.id;


--
-- Name: kb_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_versions (
    id integer NOT NULL,
    doc_id character varying(10) NOT NULL,
    version character varying(10) NOT NULL,
    updated_at date,
    updated_by character varying(100),
    changelog text
);


ALTER TABLE public.kb_versions OWNER TO postgres;

--
-- Name: kb_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kb_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kb_versions_id_seq OWNER TO postgres;

--
-- Name: kb_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kb_versions_id_seq OWNED BY public.kb_versions.id;


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base (
    id character varying(10) NOT NULL,
    title character varying(200) NOT NULL,
    category character varying(50),
    version character varying(10),
    last_updated date,
    description text,
    tags text[] DEFAULT '{}'::text[],
    source_type character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    original_filename character varying(255),
    file_size integer,
    uploaded_by text,
    extracted_at timestamp with time zone,
    content_text text,
    embedded_at timestamp with time zone,
    file_data bytea,
    file_mimetype character varying(100)
);


ALTER TABLE public.knowledge_base OWNER TO postgres;

--
-- Name: maintenance_work_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_work_orders (
    id character varying(20) NOT NULL,
    asset_code character varying(40) NOT NULL,
    asset_name character varying(200),
    type character varying(30) DEFAULT 'Planned'::character varying,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    description text NOT NULL,
    scheduled_date date,
    completed_date date,
    status character varying(30) DEFAULT 'Open'::character varying,
    technician character varying(100),
    department character varying(100),
    estimated_hours numeric(5,1) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.maintenance_work_orders OWNER TO postgres;

--
-- Name: portal_apps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_apps (
    id character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(10),
    category character varying(50),
    url character varying(200) DEFAULT '#'::character varying,
    sso_enabled boolean DEFAULT false,
    allowed_roles text[] DEFAULT '{}'::text[] NOT NULL,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.portal_apps OWNER TO postgres;

--
-- Name: pr_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pr_documents (
    id character varying(20) NOT NULL,
    pr_id character varying(30) NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(50) DEFAULT 'Document'::character varying,
    size character varying(20),
    uploaded_by character varying(100),
    uploaded_at date DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE public.pr_documents OWNER TO postgres;

--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_requests (
    id character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    requestor_name character varying(100),
    requestor_id uuid,
    department character varying(100),
    total_value numeric(14,2) NOT NULL,
    tier character varying(10) NOT NULL,
    status character varying(30) DEFAULT 'PENDING_APPROVAL'::character varying NOT NULL,
    quote_count integer DEFAULT 0,
    requires_justification boolean DEFAULT false,
    justification text,
    line_items jsonb DEFAULT '[]'::jsonb,
    approval_history jsonb DEFAULT '[]'::jsonb,
    created_at date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT purchase_requests_tier_check CHECK (((tier)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[])))
);


ALTER TABLE public.purchase_requests OWNER TO postgres;

--
-- Name: som_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.som_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    level character varying(20) NOT NULL,
    resource_key character varying(200) NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT som_permissions_level_check CHECK (((level)::text = ANY ((ARRAY['application'::character varying, 'module'::character varying, 'page'::character varying, 'field'::character varying])::text[])))
);


ALTER TABLE public.som_permissions OWNER TO postgres;

--
-- Name: som_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.som_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(20),
    full_name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'Employee'::character varying NOT NULL,
    department character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.som_users OWNER TO postgres;

--
-- Name: user_favourites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_favourites (
    user_id text NOT NULL,
    app_id character varying(20) NOT NULL
);


ALTER TABLE public.user_favourites OWNER TO postgres;

--
-- Name: user_pinned_docs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_pinned_docs (
    user_id text NOT NULL,
    doc_id character varying(10) NOT NULL
);


ALTER TABLE public.user_pinned_docs OWNER TO postgres;

--
-- Name: utility_bills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_bills (
    id character varying(20) NOT NULL,
    site_id character varying(20) NOT NULL,
    site_name character varying(100),
    utility_type character varying(30) NOT NULL,
    period character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    meter_reading numeric(12,2),
    unit character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.utility_bills OWNER TO postgres;

--
-- Name: capex_budget_uploads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_budget_uploads ALTER COLUMN id SET DEFAULT nextval('public.capex_budget_uploads_id_seq'::regclass);


--
-- Name: capex_department_monthly id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_department_monthly ALTER COLUMN id SET DEFAULT nextval('public.capex_department_monthly_id_seq'::regclass);


--
-- Name: capex_departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_departments ALTER COLUMN id SET DEFAULT nextval('public.capex_departments_id_seq'::regclass);


--
-- Name: gsap_approved_budgets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gsap_approved_budgets ALTER COLUMN id SET DEFAULT nextval('public.gsap_approved_budgets_id_seq'::regclass);


--
-- Name: kb_chunks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_chunks ALTER COLUMN id SET DEFAULT nextval('public.kb_chunks_id_seq'::regclass);


--
-- Name: kb_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_versions ALTER COLUMN id SET DEFAULT nextval('public.kb_versions_id_seq'::regclass);


--
-- Data for Name: asset_compliance_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_compliance_alerts (alert_id, asset_code, type, message, days_remaining, severity, created_at) FROM stdin;
ALT-001	MSQ-001-F01-GEN001	Contract Expiry	Maintenance contract for Standby Generator Unit 1 expires in 14 days. Renew to avoid service gap.	14	HIGH	2026-03-27 21:24:55.631911+05:30
ALT-002	SHR-004-F05-PMP001	SLA Breach	Submersible Pump Unit has been under maintenance for 18 days — SLA threshold of 15 days exceeded.	0	CRITICAL	2026-03-27 21:24:55.631911+05:30
ALT-003	SLL-003-F03-CNP001	Contract Expiry	Canopy Lighting maintenance contract expires in 45 days. Schedule renewal with facilities team.	45	MEDIUM	2026-03-27 21:24:55.631911+05:30
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assets (asset_code, name, region, site, facility, equipment_type, department, status, created_at) FROM stdin;
MSQ-001-F01-GEN001	Standby Generator Unit 1	Muscat	Al Khuwair Station	Main Forecourt	Generator	Operations	Active	2026-03-27 21:24:55.631911+05:30
MSQ-001-F01-DSP001	Fuel Dispenser Unit 1	Muscat	Al Khuwair Station	Main Forecourt	Dispenser	Retail	Active	2026-03-27 21:24:55.631911+05:30
MSQ-001-F01-DSP002	Fuel Dispenser Unit 2	Muscat	Al Khuwair Station	Main Forecourt	Dispenser	Retail	Maintenance	2026-03-27 21:24:55.631911+05:30
MSQ-002-F02-HVC001	HVAC Unit — Convenience Store	Muscat	Qurum Station	Convenience Store	HVAC	Facilities	Active	2026-03-27 21:24:55.631911+05:30
MSQ-002-F02-SEC001	CCTV Camera Array	Muscat	Qurum Station	Convenience Store	Security	QHSE	Active	2026-03-27 21:24:55.631911+05:30
SLL-003-F03-GEN001	Standby Generator	Salalah	Salalah Main Station	Forecourt	Generator	Operations	Active	2026-03-27 21:24:55.631911+05:30
SLL-003-F03-DSP001	Fuel Dispenser Unit 1	Salalah	Salalah Main Station	Forecourt	Dispenser	Retail	Active	2026-03-27 21:24:55.631911+05:30
SLL-003-F03-CNP001	Canopy Lighting Array	Salalah	Salalah Main Station	Forecourt	Lighting	Facilities	Inactive	2026-03-27 21:24:55.631911+05:30
SLL-003-F04-TRN001	Transformer Unit	Salalah	Salalah Main Station	Utility Room	Electrical	Infrastructure	Active	2026-03-27 21:24:55.631911+05:30
SHR-004-F05-DSP001	Fuel Dispenser Unit 1	Sohar	Sohar Industrial Station	Main Forecourt	Dispenser	Retail	Active	2026-03-27 21:24:55.631911+05:30
SHR-004-F05-DSP002	Fuel Dispenser Unit 2	Sohar	Sohar Industrial Station	Main Forecourt	Dispenser	Retail	Active	2026-03-27 21:24:55.631911+05:30
SHR-004-F05-PMP001	Submersible Pump Unit	Sohar	Sohar Industrial Station	Tank Farm	Pump	Operations	Maintenance	2026-03-27 21:24:55.631911+05:30
\.


--
-- Data for Name: capex_budget_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capex_budget_uploads (id, fiscal_year, filename, rows_imported, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: capex_department_monthly; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capex_department_monthly (id, department_id, month_label, budgeted, actual) FROM stdin;
49	9	Oct	50000.00	45000.00
50	9	Nov	55000.00	58000.00
51	9	Dec	65000.00	72000.00
52	9	Jan	60000.00	55000.00
53	9	Feb	55000.00	62000.00
54	9	Mar	65000.00	58000.00
55	10	Oct	30000.00	28000.00
56	10	Nov	35000.00	33000.00
57	10	Dec	40000.00	38000.00
58	10	Jan	38000.00	42000.00
59	10	Feb	35000.00	32000.00
60	10	Mar	40000.00	37000.00
61	11	Oct	140000.00	128000.00
62	11	Nov	155000.00	165000.00
63	11	Dec	175000.00	182000.00
64	11	Jan	160000.00	155000.00
65	11	Feb	150000.00	142000.00
66	11	Mar	170000.00	118000.00
67	12	Oct	110000.00	98000.00
68	12	Nov	120000.00	115000.00
69	12	Dec	130000.00	142000.00
70	12	Jan	125000.00	128000.00
71	12	Feb	115000.00	112000.00
72	12	Mar	130000.00	125000.00
73	13	Oct	75000.00	68000.00
74	13	Nov	80000.00	85000.00
75	13	Dec	90000.00	95000.00
76	13	Jan	85000.00	82000.00
77	13	Feb	78000.00	72000.00
78	13	Mar	90000.00	78000.00
79	14	Oct	20000.00	18000.00
80	14	Nov	23000.00	22000.00
81	14	Dec	25000.00	28000.00
82	14	Jan	24000.00	25000.00
83	14	Feb	22000.00	20000.00
84	14	Mar	26000.00	27000.00
\.


--
-- Data for Name: capex_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capex_departments (id, name, total_budget, committed, actual, updated_at) FROM stdin;
9	HR & Real Estate	800000.00	120000.00	350000.00	2026-04-03 21:05:44.35725+05:30
10	Finance & Operations	600000.00	80000.00	210000.00	2026-04-03 21:05:44.35725+05:30
11	Trading, Lubricants & Supply Chain	2000000.00	250000.00	890000.00	2026-04-03 21:05:44.35725+05:30
12	Aviation	1500000.00	180000.00	720000.00	2026-04-03 21:05:44.35725+05:30
13	Mobility	1200000.00	150000.00	480000.00	2026-04-03 21:05:44.35725+05:30
14	General	500000.00	60000.00	140000.00	2026-04-03 21:05:44.35725+05:30
\.


--
-- Data for Name: capex_initiations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capex_initiations (id, title, description, department, initiator, project_type, estimated_budget, priority, status, start_date, end_date, stakeholders, justification, created_by, created_at) FROM stdin;
CINIT-2026-001	Aviation Ground Support Equipment Upgrade	Replacement of ageing ground support equipment across all aviation fuelling stations to meet IATA safety standards.	Aviation	Khalid Al Rashdi	Replacement	420000.00	High	Under Review	2026-06-01	2026-12-31	Aviation, Finance & Operations, General	Mandatory compliance with IATA ground handling regulations. Existing equipment beyond service life.	\N	2026-03-01
CINIT-2026-002	EV Fleet Expansion — Mobility Division	Procurement of 25 electric vehicles to grow the Mobility fleet and support Oman's national EV adoption targets.	Mobility	Ahmed Al Balushi	New	280000.00	Medium	Approved	2026-04-15	2026-09-30	Mobility, Finance & Operations, HR & Real Estate	Strategic investment aligned with Shell's net-zero commitments and growing domestic EV demand.	\N	2026-02-15
CINIT-2026-003	Head Office Fit-Out — Phase 2	Second-phase interior fit-out of the new Muscat head office including meeting rooms, collaboration spaces, and IT infrastructure.	HR & Real Estate	Rashid Al Ghafri	New	195000.00	High	Pending Approval	2026-05-01	2026-08-31	HR & Real Estate, Finance & Operations, General	Phase 1 complete. Phase 2 required to bring remaining floors into operational use ahead of Q3 staff relocation.	\N	2026-03-10
\.


--
-- Data for Name: capex_manual_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capex_manual_entries (id, entry_type, department, period, amount, description, reference_number, entered_by, entered_by_id, entered_at, status) FROM stdin;
ME-2026-001	Actual	Mobility	2026-03	18600.00	EV charger installation at Muscat depot — vendor invoice #INV-5510	INV-5510	Sara Al Harthi	\N	2026-03-15	Posted
ME-2026-002	PO Commitment	Trading, Lubricants & Supply Chain	2026-03	67000.00	Lubricant blending equipment overhaul — PO raised for Al Maha Engineering	PO-2026-0318	Fatma Al Maamari	\N	2026-03-12	Posted
ME-2026-003	Budget Adjustment	General	2026-02	30000.00	Emergency budget reallocation for organisation-wide IT security audit	BA-2026-005	Admin User	\N	2026-02-28	Posted
\.


--
-- Data for Name: gsap_approved_budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gsap_approved_budgets (id, wbs_code, description, department, approved_amount, posted_amount, source, updated_at) FROM stdin;
9	WBS-OM-2026-HR-001	HR & Real Estate — Facilities and Property Capex	HR & Real Estate	800000.00	350000.00	manual	2026-04-03 21:05:44.35725+05:30
10	WBS-OM-2026-FIN-001	Finance & Operations — Systems and Process Capex	Finance & Operations	600000.00	210000.00	manual	2026-04-03 21:05:44.35725+05:30
11	WBS-OM-2026-TLS-001	Trading, Lubricants & Supply Chain — Infrastructure Capex	Trading, Lubricants & Supply Chain	2000000.00	890000.00	manual	2026-04-03 21:05:44.35725+05:30
12	WBS-OM-2026-AVN-001	Aviation — Equipment and Facilities Capex	Aviation	1500000.00	720000.00	manual	2026-04-03 21:05:44.35725+05:30
13	WBS-OM-2026-MOB-001	Mobility — Fleet and Charging Infrastructure Capex	Mobility	1200000.00	480000.00	manual	2026-04-03 21:05:44.35725+05:30
14	WBS-OM-2026-GEN-001	General — Organisation-Wide Capex	General	500000.00	140000.00	manual	2026-04-03 21:05:44.35725+05:30
\.


--
-- Data for Name: gsap_sync_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gsap_sync_status (id, mode, last_synced, source, message) FROM stdin;
1	manual	\N	Manual Entry	GSAP connection pending — SAP undergoing maintenance. Using manual entry mode.
\.


--
-- Data for Name: kb_chunks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kb_chunks (id, doc_id, chunk_index, content, embedding) FROM stdin;
11	KB-001	0	Purchase Request Approval Workflow SOM Platform v3.0. Scope: applies to all Shell Oman Marketing employees procuring goods or services above OMR 100. Raising a purchase request: log in to SOM Platform, navigate to Module B Purchase Requests, click New Purchase Request, complete mandatory fields including title department estimated cost currency OMR justification and required delivery date. For requests above OMR 5000 the three-quote rule applies requiring at least three competitive vendor quotations uploaded as PDF attachments. Select cost centre and submit for approval. The system automatically routes to the line manager.	\N
12	KB-001	1	Approval tiers for purchase requests: LOW tier under OMR 5000 requires line manager approval only. MEDIUM tier OMR 5000 to 50000 requires line manager and department head. HIGH tier above OMR 50000 requires line manager department head finance director and CEO sign-off. Three-quote rule: all MEDIUM and HIGH requests must include three independent vendor quotations dated within 90 days. Single-source justification forms require department head approval to bypass the three-quote requirement.	\N
13	KB-001	2	Escalation policy for purchase requests: if not actioned within 5 business days the system escalates automatically and sends email alerts. Closure: approved requests receive a Purchase Order PO number. Requestor confirms receipt on delivery to trigger payment. Rejections must include written reason and requestor may resubmit within 10 business days. All approved purchase requests are archived in SOM Platform for 7 years in accordance with document retention policy.	\N
14	KB-002	0	Capital Expenditure Budget Approval Policy SOM v4.0. Purpose: establishes authority matrix for approving capital expenditure Capex requests at Shell Oman Marketing. Definitions: Capex is expenditure on assets with expected useful life more than one year and value exceeding OMR 1000. Committed Capex means approved expenditure with a purchase order raised. Actual Capex means expenditure for which invoices have been received and posted.	\N
15	KB-002	1	Capex authority matrix: TIER A up to OMR 50000 requires department head approval. TIER B OMR 50001 to 300000 requires department head and finance director. TIER C OMR 300001 to 1000000 requires department head finance director and CEO. TIER D above OMR 1000000 requires board approval via CEO submission to Board Investment Committee. All Capex must align to approved annual budget. Unbudgeted Capex above OMR 100000 requires board notification. QHSE sign-off required for equipment facility modification or hazardous material storage Capex.	\N
16	KB-002	2	GSAP synchronisation: approved Capex recorded in GSAP SAP system. SOM Platform syncs with GSAP every 4 hours to update committed and actual figures on the Capex dashboard. Discrepancies over OMR 5000 between SOM Platform and GSAP must be reported to Finance within 24 hours. Amendments to scope up to 10 percent cost increase approved at same tier. Above 10 percent requires re-approval at appropriate tier for revised total. Policy reviewed annually by Finance Director and approved by CEO.	\N
17	KB-003	0	Asset Registration and RADP Guidelines SOM Platform v2.0. All physical assets owned by Shell Oman Marketing must be registered in the RADP Region Area District Point hierarchy within 30 days of acquisition. RADP hierarchy: Region is top-level geographic grouping such as Muscat Region or Salalah Region. Site is a specific location such as Qurum Station or Sohar Main Depot. Facility is a functional area such as Fuel Dispensing Area LPG Storage or Workshop. Equipment is an individual asset such as Pump Unit or Generator.	\N
18	KB-003	1	Asset codes follow the format REG-SITE-FAC-TYPE-NNN. Example MUS-QUR-FDA-PMP-001 means Muscat Region Qurum Station Fuel Dispensing Area Pump number 001. Approved equipment type codes: GEN Generator DSP Dispenser HVC HVAC PMP Pump TNK Tank TRF Transformer FLT Filter CMP Compressor. Registration steps: navigate to Module C Assets in SOM Platform, select Region Site Facility, click Register New Equipment, complete all mandatory fields including serial number manufacturer installation date and purchase cost in OMR, upload commissioning certificate or invoice.	\N
19	KB-003	2	Utility billing for assets: sites with utility metering for electricity water or LPG must link meter IDs to facility records. Monthly meter readings entered by Site Engineer. SOM Platform calculates and posts utility charges to cost centre on the 1st of each month. Annual asset verification required: all assets physically verified by Site Engineer each calendar year. Assets not confirmed within calendar year are flagged for write-off review.	\N
20	KB-004	0	Incident and Near-Miss Reporting Procedure SOM QHSE v5.0. Purpose: mandatory requirements for reporting investigating and closing workplace incidents near-misses and environmental events at all SOM sites and offices. Definitions: Incident is an unplanned event resulting in injury illness property damage or environmental impact. Near-Miss is an unplanned event that did not result in harm but had the potential to under slightly different circumstances. Environmental Event is any unplanned release of fuel lubricant chemical or waste to the environment. Lost Time Injury LTI means employee unable to return to work the following day.	\N
21	KB-004	1	Reporting timelines: all incidents and near-misses must be reported within 24 hours to Site Manager and QHSE Department. Lost Time Injuries LTIs and High-Potential incidents must be reported to QHSE Director and CEO within 4 hours. Environmental releases above threshold quantities must be reported to Ministry of Environment within 24 hours. How to report: ensure immediate safety of people and contain incident, notify Site Manager by phone, log in to SOM Platform navigate to QHSE Incident Reporting, complete Incident Report Form with date time location description immediate causes persons involved and initial actions, attach photographs, submit to receive unique Incident Reference Number IRN.	\N
22	KB-004	2	Investigation requirements: all LTIs and High-Potential near-misses require formal Root Cause Analysis RCA within 5 business days using 5-Why methodology reviewed by QHSE Manager. Corrective actions assigned with owners and due dates in SOM Platform. Close-out requires sign-off from QHSE Manager and Department Head after all corrective actions verified complete. SOM Platform generates monthly QHSE dashboards including Total Recordable Incident Rate TRIR and Lost Time Injury Frequency LTIF reviewed at monthly Leadership Team meeting.	\N
23	KB-005	0	Annual Leave and Absence Policy Shell Oman Marketing HR v3.0. Entitlements: all permanent SOM employees are entitled to 30 calendar days annual leave per completed year of service. Employees in first year accrue 2.5 days per completed month. Employees with more than 10 years service are entitled to 35 calendar days per year. Contractual employees receive leave entitlement as specified in individual employment contracts. SOM observes all Omani national public holidays as declared by the Government of Oman.	\N
24	KB-005	1	Annual leave application process: apply via SOM Platform HR module at least 5 business days in advance for leave up to 5 days. For leave exceeding 5 days apply at least 15 business days in advance. Line manager must approve or reject within 3 business days. Carry-forward: maximum 15 days unused annual leave may be carried forward to following year. Carried forward leave must be taken by 31 March of following year. Unused carried-forward leave is forfeited and not encashed except upon termination of employment.	\N
25	KB-005	2	Blackout periods for annual leave: leave may not be approved during final two weeks of financial year mid to end December, National Day period 17 to 19 November, and department blackout periods notified by Department Heads. Emergency leave: up to 5 days granted by line manager for serious family emergencies, deducted from annual leave balance. Additional emergency leave beyond 5 days requires HR Director approval. Unpaid leave may be granted by HR Director in exceptional circumstances after all paid leave entitlements exhausted, requiring documentary evidence.	\N
26	KB-006	0	IT Security and Acceptable Use Policy SOM IT v6.0. Purpose: defines rules for acceptable use of all Shell Oman Marketing IT resources including hardware software networks cloud services and data. Mandatory for all employees contractors and third parties. Password standards: minimum 12 characters including uppercase lowercase numeral and special character. Passwords must not include user name employee ID or the words Shell or Oman. Passwords must be changed every 90 days. Last 10 passwords may not be reused. Multi-Factor Authentication MFA is mandatory for all remote access cloud services and SOM Platform.	\N
27	KB-006	1	Acceptable use rules: SOM IT resources may be used for business purposes with limited personal use during breaks. Prohibited activities include downloading unlicensed software, accessing offensive or illegal material, bypassing security controls, using unapproved VPNs, installing unauthorised software, and connecting personal USB drives without IT approval. AI tool usage guidelines: approved AI tools may be used for business productivity including drafting summarising and coding assistance. Employees must NOT input SOM confidential data customer data financial data or personal data into any AI tool unless on the SOM-approved AI services list.	\N
28	KB-006	2	Data classification at SOM: CONFIDENTIAL includes financial data personal data contract terms and strategic plans which must be encrypted in transit and at rest with access on need-to-know basis. INTERNAL includes operational data policies and procedures not for external distribution. PUBLIC is information approved for external publication. IT security incident reporting: suspected phishing malware data breach or lost device must be reported to IT Security Team within 1 hour. Policy aligns with Oman National Cybersecurity Authority NCA Essential Cybersecurity Controls ECC. Non-compliance may result in disciplinary action up to termination.	\N
29	KB-007	0	Vendor Onboarding and Pre-qualification Procedure SOM Procurement v2.0. Scope: applies to all new vendors seeking to do business with Shell Oman Marketing. No purchase order may be raised for a vendor not registered and active in the SOM procurement system. Eligibility: vendors must be legally registered entities in Oman or country of supply. Vendors supplying on-site services must hold valid Commercial Registration CR in Oman and comply with Omanisation requirements. Required documentation includes Commercial Registration Certificate Tax Card bank account details company profile client references.	\N
30	KB-007	1	High-risk vendor categories including fuel handling electrical works and civil construction must additionally submit proof of QHSE pre-qualification relevant ISO certificates and list of equipment owned. Omanisation requirements: vendors providing services at SOM sites must demonstrate compliance with Omanisation ratio stipulated by Ministry of Labour. Evidence submitted annually. Vendors failing to maintain required Omanisation ratio suspended from receiving new purchase orders until compliance restored. Onboarding steps: requestor nominates vendor in SOM Platform Procurement Vendor Onboarding module, vendor receives email to upload documents to SOM Vendor Portal.	\N
31	KB-007	2	Vendor onboarding process continuation: Procurement reviews documents within 5 business days and returns incomplete submissions to vendor with comments. Finance verifies bank details and sets up vendor in SAP Vendor Master Data. Procurement activates vendor in SOM Platform and notifies requestor. Annual review of all vendor records: vendors with no purchase order activity in preceding 12 months are placed on Dormant status. Dormant vendors must resubmit current documentation before a new purchase order can be raised.	\N
32	KB-008	0	Health and Safety Site Induction Checklist SOM QHSE v2.0. All new employees and contractors must complete this induction before commencing work at any Shell Oman Marketing site. Completed checklist must be signed by inductee and Site Manager and retained on file for duration of assignment. Site rules: speed limit on all SOM sites is 15 km per hour with pedestrians having right of way. Mobile phone use while driving on site is prohibited. Smoking only permitted in designated areas and strictly prohibited within 15 metres of fuel storage dispensing or LPG areas. Zero tolerance for alcohol or controlled substances on site.	\N
33	KB-008	1	Personal Protective Equipment PPE requirements: safety shoes with steel toecap and oil-resistant sole mandatory in all operational areas. High-visibility vest mandatory. Safety glasses or goggles mandatory. Hearing protection required in areas marked with yellow hearing protection signs. Hard hats mandatory in civil construction and overhead work areas. Cut-resistant gloves required for manual handling of sharp objects. Emergency procedures: fire discovery requires raising alarm via nearest break-glass call point then evacuate via nearest emergency exit and assemble at designated muster point. Do not use lifts during fire evacuation.	\N
34	KB-008	2	Emergency procedures continued: fuel spill response requires stopping the source if safe to do so, activating site spill kit, containing spill with absorbent boom, preventing fuel from entering drains, notifying Site Manager and QHSE, completing incident report in SOM Platform within 24 hours. Medical emergency procedure: call 999 Oman emergency services and notify Site Manager. First aid kit and AED defibrillator locations shown on site map provided at induction. Muster points: Muscat Region primary muster point marked on site map. Salalah Region primary muster point at main site entrance. All muster points reviewed after any site modification.	\N
\.


--
-- Data for Name: kb_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kb_versions (id, doc_id, version, updated_at, updated_by, changelog) FROM stdin;
85	KB-001	3.0	2026-03-10	Fatima Al Said	Raised MEDIUM tier upper threshold from OMR 30k to OMR 50k; clarified three-quote currency requirement.
86	KB-001	2.1	2025-06-01	Fatima Al Said	Updated section 4 — single-source justification now requires Department Head approval.
87	KB-001	2.0	2024-09-15	Ahmed Al Balushi	Major revision: added digital submission workflow and removed paper form references.
88	KB-002	4.0	2026-01-20	Mohammed Al Rashdi	Raised TIER B ceiling to OMR 300k; added mandatory QHSE sign-off clause for all operational Capex.
89	KB-002	3.1	2025-04-01	Mohammed Al Rashdi	Added GSAP sync discrepancy reporting requirement; clarified unbudgeted Capex board notification threshold.
90	KB-002	3.0	2024-11-01	Sara Al Farsi	Introduced TIER D board approval for Capex above OMR 1M.
91	KB-003	2.0	2025-12-01	Khalid Al Siyabi	Added full equipment type code table and revised annual verification requirement.
92	KB-003	1.4	2025-07-20	Khalid Al Siyabi	Corrected RADP asset code format: facility segment changed from 2 to 3 characters.
93	KB-004	5.0	2026-02-15	Nadia Al Harthy	Full rewrite to align with Shell Group HSSE Standards 2025. Added environmental event thresholds in Appendix A.
94	KB-004	4.2	2025-08-01	Nadia Al Harthy	Added environmental near-miss reporting section; updated escalation contacts.
95	KB-005	3.0	2026-01-01	HR Department	Increased carry-forward cap from 10 to 15 days; added emergency leave category.
96	KB-005	2.1	2024-07-01	HR Department	Updated public holiday schedule reference; minor formatting corrections.
97	KB-006	6.0	2026-02-01	IT Security Team	Added AI tool usage section; updated NCA ECC alignment notes; raised MFA requirement to all cloud services.
98	KB-006	5.1	2025-06-15	IT Security Team	Added data residency requirements; clarified USB device prohibition.
99	KB-006	5.0	2025-01-10	IT Security Team	Major update for NCA ECC compliance — new password complexity and 90-day rotation requirement.
100	KB-007	2.0	2025-10-01	Procurement Team	Added Omanisation compliance section and high-risk vendor QHSE pre-qualification requirements.
101	KB-007	1.3	2024-06-01	Procurement Team	Aligned vendor master data fields with updated SAP configuration.
102	KB-008	2.0	2026-03-01	QHSE Department	Added fuel spill response procedure; updated muster point locations for Sohar and Salalah sites.
103	KB-008	1.1	2025-01-15	QHSE Department	Added AED defibrillator location reference; updated fire assembly point for Qurum Station.
\.


--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_base (id, title, category, version, last_updated, description, tags, source_type, original_filename, file_size, uploaded_by, extracted_at, content_text, embedded_at, file_data, file_mimetype) FROM stdin;
KB-001	Purchase Request Approval Workflow	Procedure	3.0	2026-03-10	End-to-end procedure for raising, approving, and closing a purchase request in SOM Platform.	{purchase,procurement,approval,workflow,three-quote,SOM}	pdf	PR_Approval_Workflow_v3.pdf	184320	Fatima Al Said	2026-04-28 20:39:04.564294+05:30	Purchase Request Approval Workflow — SOM Platform v3.0\n\n1. SCOPE\nThis procedure applies to all Shell Oman Marketing (SOM) employees who need to procure goods or services with a value above OMR 100. All purchase requests must be submitted through the SOM Platform Purchase Request module.\n\n2. RAISING A PURCHASE REQUEST\n2.1  Log in to SOM Platform and navigate to Module B — Purchase Requests.\n2.2  Click "New Purchase Request". Complete all mandatory fields: title, department, estimated cost, currency (OMR), justification, and required delivery date.\n2.3  For requests above OMR 5,000 the three-quote rule applies. Upload at least three competitive vendor quotations as PDF attachments before submission.\n2.4  Select the appropriate cost centre from the dropdown. If the cost centre is not listed, contact Finance to have it added.\n2.5  Click "Submit for Approval". The system automatically routes the request to the line manager.\n\n3. APPROVAL TIERS\nLOW (< OMR 5,000):   Line Manager approval only.\nMEDIUM (OMR 5,000 – 50,000): Line Manager + Department Head.\nHIGH (> OMR 50,000): Line Manager + Department Head + Finance Director + CEO sign-off required.\n\n4. THREE-QUOTE RULE\nAll requests in the MEDIUM and HIGH tiers must include a minimum of three independent vendor quotations. Quotations must be dated within 90 days of submission. Single-source justification forms are available from Procurement and must be approved by the Department Head before a request can bypass the three-quote requirement.\n\n5. ESCALATION\nIf a request is not actioned within 5 business days at any approval tier, the system automatically escalates it to the next level and sends an email alert to the approver and the requestor. If escalation reaches CEO level with no action after 3 further days, the Head of Procurement is notified.\n\n6. CLOSURE\nOnce all approvals are received, the system issues a Purchase Order (PO) number. The requestor is notified by email. The PO must be quoted on all supplier invoices. On delivery, the requestor confirms receipt in the system to trigger payment processing.\n\n7. REJECTIONS\nRejected requests must include a written reason. The requestor may resubmit with amendments within 10 business days. A second rejection is final and must be escalated to the Department Head if the requestor disputes the outcome.\n\n8. RECORD KEEPING\nAll approved purchase requests are archived in SOM Platform for 7 years in accordance with SOM document retention policy.	\N	\N	\N
KB-002	Capex Budget Approval Policy	Policy	4.0	2026-01-20	Defines authority limits, approval tiers, and escalation paths for all capital expenditure at Shell Oman Marketing.	{capex,budget,approval,authority,policy,finance,OMR}	pdf	Capex_Budget_Approval_Policy_v4.pdf	210944	Mohammed Al Rashdi	2026-04-28 20:39:04.564294+05:30	Capital Expenditure Budget Approval Policy — SOM v4.0\n\n1. PURPOSE\nThis policy establishes the authority matrix for approving capital expenditure (Capex) requests at Shell Oman Marketing (SOM). It ensures appropriate governance, financial control, and alignment with the approved annual Capex budget.\n\n2. DEFINITIONS\nCapex: Expenditure on assets with an expected useful life of more than one year and a value exceeding OMR 1,000.\nCommitted Capex: Approved expenditure for which a purchase order has been raised.\nActual Capex: Expenditure for which invoices have been received and posted.\n\n3. AUTHORITY MATRIX\nTIER A — Up to OMR 50,000: Department Head approval.\nTIER B — OMR 50,001 to OMR 300,000: Department Head + Finance Director approval.\nTIER C — OMR 300,001 to OMR 1,000,000: Department Head + Finance Director + CEO approval.\nTIER D — Above OMR 1,000,000: Board approval required. CEO submits to Board Investment Committee.\n\n4. BUDGET ALIGNMENT\nAll Capex requests must be aligned to the current approved annual budget. Requests that exceed the departmental budget line require a budget transfer approval from Finance before submission. Unbudgeted Capex above OMR 100,000 requires Board notification.\n\n5. QHSE SIGN-OFF\nAll Capex requests with a QHSE implication (new equipment, facility modification, hazardous material storage) must carry a QHSE sign-off from the Head of QHSE before Finance Director approval.\n\n6. GSAP SYNCHRONISATION\nApproved Capex is recorded in GSAP (SAP). SOM Platform syncs with GSAP every 4 hours to update committed and actual figures on the Capex dashboard. Discrepancies of more than OMR 5,000 between SOM Platform and GSAP must be reported to Finance within 24 hours.\n\n7. AMENDMENTS\nAmendments to approved Capex (scope changes, cost increases up to 10%) may be approved at the same tier as the original. Cost increases exceeding 10% require re-approval at the appropriate tier for the revised total value.\n\n8. ANNUAL REVIEW\nThis policy is reviewed annually by the Finance Director and approved by the CEO. The current version supersedes all previous versions.	\N	\N	\N
KB-003	Asset Registration and RADP Guidelines	Procedure	2.0	2025-12-01	How to register new physical assets in the RADP hierarchy: Region, Site, Facility, Equipment.	{asset,RADP,registration,equipment,tagging,hierarchy,site}	pdf	Asset_Registration_RADP_v2.pdf	163840	Khalid Al Siyabi	2026-04-28 20:39:04.564294+05:30	Asset Registration and RADP Guidelines — SOM Platform v2.0\n\n1. OVERVIEW\nAll physical assets owned or operated by Shell Oman Marketing must be registered in the RADP (Region – Area – District – Point) hierarchy within the SOM Platform Assets module within 30 days of acquisition or commissioning.\n\n2. RADP HIERARCHY\nRegion: Top-level geographic grouping (e.g., Muscat Region, Salalah Region).\nSite: A specific location within a region (e.g., Qurum Station, Sohar Main Depot).\nFacility: A functional area within a site (e.g., Fuel Dispensing Area, LPG Storage, Workshop).\nEquipment: An individual asset within a facility (e.g., Pump Unit PMP-001, Generator GEN-002).\n\n3. ASSET CODES\nEach asset receives a unique code in the format: REG-SITE-FAC-TYPE-NNN\nExample: MUS-QUR-FDA-PMP-001 = Muscat Region / Qurum Station / Fuel Dispensing Area / Pump / 001\nApproved equipment type codes: GEN (Generator), DSP (Dispenser), HVC (HVAC), PMP (Pump), TNK (Tank), TRF (Transformer), FLT (Filter), CMP (Compressor).\n\n4. REGISTRATION STEPS\n4.1  Navigate to Module C — Assets in SOM Platform.\n4.2  Select the Region, then Site, then Facility from the dropdown hierarchy.\n4.3  Click "Register New Equipment".\n4.4  Complete all mandatory fields: asset name, equipment type code, serial number, manufacturer, installation date, purchase cost (OMR), and responsible department.\n4.5  Upload the commissioning certificate or purchase invoice as a PDF attachment.\n4.6  Click Submit. The asset record is created and assigned the next sequential code.\n\n5. UTILITY BILLING\nSites with utility metering (electricity, water, LPG) must link meter IDs to the corresponding facility record. Monthly meter readings are entered by the Site Engineer. SOM Platform calculates and posts utility charges to the relevant cost centre automatically on the 1st of each month.\n\n6. ANNUAL ASSET VERIFICATION\nAll assets must be physically verified annually by the responsible Site Engineer and confirmed in SOM Platform. Assets not confirmed within the calendar year are flagged for write-off review.	\N	\N	\N
KB-004	Incident and Near-Miss Reporting Procedure	QHSE	5.0	2026-02-15	Mandatory 24-hour reporting procedure for all workplace incidents, near-misses, and environmental events at SOM sites.	{incident,near-miss,safety,QHSE,reporting,24-hour,HSE}	pdf	Incident_Reporting_Procedure_v5.pdf	196608	Nadia Al Harthy	2026-04-28 20:39:04.564294+05:30	Incident and Near-Miss Reporting Procedure — SOM QHSE v5.0\n\n1. PURPOSE AND SCOPE\nThis procedure sets out the mandatory requirements for reporting, investigating, and closing workplace incidents, near-misses, and environmental events at all Shell Oman Marketing (SOM) sites and offices. It applies to all SOM employees, contractors, and visitors.\n\n2. DEFINITIONS\nIncident: An unplanned event that results in, or has the potential to result in, injury, illness, property damage, or environmental impact.\nNear-Miss: An unplanned event that did not result in harm but had the potential to do so under slightly different circumstances.\nEnvironmental Event: Any unplanned release of a substance (fuel, lubricant, chemical, waste) to the environment.\nLost Time Injury (LTI): An injury that results in the employee being unable to return to work the following calendar day.\n\n3. REPORTING TIMELINE\nAll incidents and near-misses MUST be reported within 24 hours of occurrence to the Site Manager and the QHSE Department.\nLTIs and High-Potential incidents must be reported to the QHSE Director and the CEO within 4 hours.\nEnvironmental releases above the threshold quantities defined in Appendix A must be reported to the Ministry of Environment within 24 hours.\n\n4. HOW TO REPORT\n4.1  Ensure the immediate safety of people and contain the incident if safe to do so.\n4.2  Notify the Site Manager immediately by phone.\n4.3  Log in to SOM Platform, navigate to QHSE > Incident Reporting.\n4.4  Complete the Incident Report Form: date, time, location, description, immediate causes, persons involved, and initial actions taken.\n4.5  Attach photographs where available.\n4.6  Submit the report. A unique Incident Reference Number (IRN) is assigned automatically.\n\n5. INVESTIGATION\nAll LTIs and High-Potential near-misses require a formal Root Cause Analysis (RCA) within 5 business days. The RCA must use the 5-Why methodology and be reviewed by the QHSE Manager. Corrective actions must be assigned with owners and due dates in SOM Platform.\n\n6. CLOSE-OUT\nIncidents are closed in SOM Platform only when all corrective actions are verified as complete. Close-out requires sign-off from the QHSE Manager and the Department Head.\n\n7. STATISTICS AND REPORTING\nSOM Platform generates monthly QHSE dashboards including Total Recordable Incident Rate (TRIR) and Lost Time Injury Frequency (LTIF). These are reviewed at the monthly Leadership Team meeting.	\N	\N	\N
KB-005	Annual Leave and Absence Policy	HR	3.0	2026-01-01	Entitlements, approval process, carry-forward rules, and blackout periods for annual leave at SOM.	{leave,"annual leave",HR,entitlement,carry-forward,absence,holiday}	pdf	Annual_Leave_Policy_v3.pdf	147456	HR Department	2026-04-28 20:39:04.564294+05:30	Annual Leave and Absence Policy — Shell Oman Marketing HR v3.0\n\n1. ENTITLEMENTS\nAll permanent SOM employees are entitled to 30 calendar days of annual leave per completed year of service.\nEmployees in their first year accrue leave at 2.5 days per completed month of service.\nEmployees with more than 10 years of service are entitled to 35 calendar days per year.\nContractual employees receive leave entitlement as specified in their individual employment contracts.\n\n2. PUBLIC HOLIDAYS\nSOM observes all Omani national public holidays as declared by the Government of Oman. The HR department publishes the confirmed public holiday schedule for the coming year before 1 December each year. Public holidays falling on a weekend are not carried over.\n\n3. APPLICATION PROCESS\n3.1  Employees must apply for annual leave via SOM Platform HR module at least 5 business days in advance for leave of up to 5 days.\n3.2  For leave exceeding 5 days, applications must be submitted at least 15 business days in advance.\n3.3  The line manager must approve or reject the application within 3 business days.\n3.4  Approved leave is automatically reflected in the team calendar and HR records.\n\n4. CARRY-FORWARD\nA maximum of 15 days of unused annual leave may be carried forward to the following year. Leave carried forward must be taken by 31 March of the following year. Unused carried-forward leave is forfeited and will not be encashed except upon termination of employment.\n\n5. BLACKOUT PERIODS\nAnnual leave may not be approved during the following blackout periods without prior approval from the HR Director:\n- Final two weeks of the financial year (mid to end of December).\n- National Day period (17–19 November).\n- Individual department blackout periods as notified by Department Heads.\n\n6. EMERGENCY LEAVE\nUp to 5 days of emergency leave may be granted by the line manager for serious family emergencies. Emergency leave is deducted from the annual leave balance. Additional emergency leave beyond 5 days requires HR Director approval.\n\n7. UNPAID LEAVE\nUnpaid leave may be granted by the HR Director in exceptional circumstances after all paid leave entitlements are exhausted. Applications must be supported by documentary evidence of the circumstances.	\N	\N	\N
KB-006	IT Security and Acceptable Use Policy	Policy	6.0	2026-02-01	Governs acceptable use of SOM IT systems, password standards, AI tool usage, and data classification.	{IT,security,password,"acceptable use",data,AI,MFA,NCA,classification}	pdf	IT_Security_AUP_v6.pdf	229376	IT Security Team	2026-04-28 20:39:04.564294+05:30	IT Security and Acceptable Use Policy — SOM IT v6.0\n\n1. PURPOSE\nThis policy defines the rules for acceptable use of all Shell Oman Marketing (SOM) information technology resources, including hardware, software, networks, cloud services, and data. Compliance is mandatory for all employees, contractors, and third parties with access to SOM systems.\n\n2. PASSWORD STANDARDS\nAll SOM system passwords must meet the following minimum requirements:\n- Minimum 12 characters in length.\n- Must include at least one uppercase letter, one lowercase letter, one numeral, and one special character.\n- Passwords must not include the user's name, employee ID, or the word "Shell" or "Oman".\n- Passwords must be changed every 90 days.\n- Password reuse: the last 10 passwords may not be reused.\nMulti-Factor Authentication (MFA) is mandatory for all remote access connections, cloud services, and SOM Platform.\n\n3. ACCEPTABLE USE\n3.1  SOM IT resources may be used for business purposes only. Limited personal use during breaks is permitted provided it does not consume excessive bandwidth or violate any other clause of this policy.\n3.2  The following activities are strictly prohibited on SOM networks and devices:\n     - Downloading, storing, or sharing unlicensed software.\n     - Accessing, creating, or distributing material that is offensive, discriminatory, or illegal.\n     - Bypassing security controls, using VPNs not approved by IT, or installing unauthorised software.\n     - Connecting personal storage devices (USB drives) to SOM equipment without prior IT approval.\n\n4. AI TOOL USAGE\n4.1  Approved AI tools may be used for business productivity purposes (drafting, summarising, coding assistance).\n4.2  Employees must NOT input SOM confidential data, customer data, financial data, or personal data into any AI tool unless the tool is on the SOM-approved AI services list published by IT.\n4.3  The SOM-approved AI services list is reviewed quarterly by the IT Security Team and published on the intranet.\n4.4  Violations of the AI tool usage guidelines may result in disciplinary action.\n\n5. DATA CLASSIFICATION\nCONFIDENTIAL: Financial data, personal data, contract terms, strategic plans. Must be encrypted in transit and at rest. Access on a need-to-know basis.\nINTERNAL: Operational data, policies, procedures. Not for external distribution.\nPUBLIC: Information approved for external publication.\n\n6. INCIDENT REPORTING\nAny suspected IT security incident (phishing, malware, data breach, lost device) must be reported to the IT Security Team within 1 hour of discovery by calling the IT Security Hotline or emailing itsecurity@shell-oman.com.\n\n7. COMPLIANCE\nThis policy aligns with the Oman National Cybersecurity Authority (NCA) Essential Cybersecurity Controls (ECC). Non-compliance may result in disciplinary action up to and including termination of employment and criminal prosecution.	\N	\N	\N
KB-007	Vendor Onboarding and Pre-qualification Procedure	Procedure	2.0	2025-10-01	Process for registering, pre-qualifying, and activating new vendors in the SOM procurement system.	{vendor,supplier,onboarding,procurement,pre-qualification,Omanisation,SAP}	pdf	Vendor_Onboarding_Procedure_v2.pdf	172032	Procurement Team	2026-04-28 20:39:04.564294+05:30	Vendor Onboarding and Pre-qualification Procedure — SOM Procurement v2.0\n\n1. SCOPE\nThis procedure applies to all new vendors (suppliers of goods or services) seeking to do business with Shell Oman Marketing (SOM). No purchase order may be raised for a vendor that is not registered and active in the SOM procurement system.\n\n2. ELIGIBILITY\nVendors must be legally registered entities in the Sultanate of Oman or the country of supply. Vendors supplying services on-site at SOM facilities must hold a valid Commercial Registration (CR) in Oman and comply with Omanisation requirements.\n\n3. REQUIRED DOCUMENTATION\nAll vendors must submit the following documents as part of the onboarding application:\n- Commercial Registration Certificate (valid, not expired).\n- Tax Card (if applicable).\n- Bank account details on company letterhead.\n- Company profile and list of key personnel.\n- References from at least two existing clients.\nFor high-risk vendor categories (fuel handling, electrical works, civil construction): additionally submit proof of QHSE pre-qualification, relevant ISO certificates, and a list of equipment owned.\n\n4. OMANISATION REQUIREMENTS\nVendors providing services at SOM sites must demonstrate compliance with the Omanisation ratio stipulated by the Ministry of Labour for their business category. Evidence of Omanisation compliance must be submitted annually. Vendors failing to maintain the required Omanisation ratio will be suspended from receiving new POs until compliance is restored.\n\n5. ONBOARDING STEPS\n5.1  The SOM requestor nominates the vendor in SOM Platform (Procurement > Vendor Onboarding).\n5.2  The vendor receives an automated email with a link to the SOM Vendor Portal to upload required documents.\n5.3  Procurement reviews documents within 5 business days. Incomplete submissions are returned to the vendor with comments.\n5.4  Finance verifies bank details and sets up the vendor in SAP (Vendor Master Data).\n5.5  Procurement activates the vendor in SOM Platform. The requestor is notified and may now raise purchase requests for that vendor.\n\n6. ANNUAL REVIEW\nAll vendor records are reviewed annually. Vendors with no PO activity in the preceding 12 months are placed on Dormant status. Dormant vendors must resubmit current documentation before a new PO can be raised.	\N	\N	\N
KB-008	Health and Safety Site Induction Checklist	QHSE	2.0	2026-03-01	Mandatory induction checklist for new employees and contractors at all Shell Oman Marketing sites.	{safety,induction,PPE,contractor,onboarding,checklist,site,fire,emergency}	pdf	HS_Site_Induction_Checklist_v2.pdf	139264	QHSE Department	2026-04-28 20:39:04.564294+05:30	Health and Safety Site Induction Checklist — SOM QHSE v2.0\n\n1. PURPOSE\nAll new employees and contractors must complete this induction before commencing work at any Shell Oman Marketing (SOM) site. The completed checklist must be signed by the inductee and the Site Manager and retained on file for the duration of the assignment.\n\n2. SITE RULES\n- Speed limit on all SOM sites: 15 km/h. Pedestrians have right of way.\n- Mobile phone use while driving on site is prohibited.\n- Smoking is only permitted in designated smoking areas. Smoking is strictly prohibited within 15 metres of any fuel storage, dispensing, or LPG area.\n- Consumption of alcohol or controlled substances on site is a zero-tolerance violation resulting in immediate removal and termination or contract cancellation.\n\n3. PERSONAL PROTECTIVE EQUIPMENT (PPE)\nThe following PPE is mandatory in all operational areas unless signage indicates otherwise:\n- Safety shoes (steel toecap, oil-resistant sole).\n- High-visibility vest.\n- Safety glasses or goggles.\n- Hearing protection in areas marked with yellow hearing protection signs.\nHard hats are mandatory in all civil construction and overhead work areas. Cut-resistant gloves are required for all manual handling of sharp objects.\n\n4. EMERGENCY PROCEDURES\n4.1  FIRE: If you discover a fire, raise the alarm using the nearest break-glass call point. Evacuate immediately via the nearest emergency exit. Do not use lifts. Assemble at the designated muster point shown on the site map. Do not re-enter the building until the all-clear is given by the Site Manager.\n4.2  FUEL SPILL: Stop the source if safe to do so. Activate the site spill kit. Contain the spill with absorbent boom. Do not allow fuel to enter drains. Notify the Site Manager and QHSE immediately. Complete an incident report in SOM Platform within 24 hours.\n4.3  MEDICAL EMERGENCY: Call 999 (Oman emergency services). Notify the Site Manager. The location of the first aid kit and AED defibrillator is shown on the site map.\n\n5. MUSTER POINTS\nMuscat Region sites: primary muster point is marked on the site map provided at induction.\nSalalah Region sites: primary muster point is at the main site entrance.\nAll muster points are reviewed and updated after any site modification.\n\n6. SIGN-OFF\nBy signing this checklist, the inductee confirms that they have received, understood, and agree to comply with all SOM site health and safety rules.\nInductee signature: ____________   Date: ____________\nSite Manager signature: __________  Date: ____________	\N	\N	\N
\.


--
-- Data for Name: maintenance_work_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_work_orders (id, asset_code, asset_name, type, priority, description, scheduled_date, completed_date, status, technician, department, estimated_hours, notes, created_at) FROM stdin;
WO-2026-001	MSQ-001-F01-GEN001	Standby Generator Unit 1	Planned	Medium	Annual servicing and oil change	2026-03-25	\N	Open	Ahmed Al Rashdi	Operations	4.0		2026-03-27 21:24:55.631911+05:30
WO-2026-002	MSQ-001-F01-DSP002	Fuel Dispenser Unit 2	Unplanned	High	Meter calibration failure — urgent repair required	2026-03-18	2026-03-19	Completed	Mohammed Al Balushi	Retail	2.0	Replaced flow meter board	2026-03-27 21:24:55.631911+05:30
WO-2026-003	SHR-004-F05-PMP001	Submersible Pump Unit	Unplanned	Critical	Pump seal failure causing intermittent shutdown	2026-03-01	\N	In Progress	Khalid Al Siyabi	Operations	8.0	Awaiting seal kit from supplier	2026-03-27 21:24:55.631911+05:30
WO-2026-004	SLL-003-F03-CNP001	Canopy Lighting Array	Planned	Low	Replace 12 LED fixtures as part of scheduled upgrade	2026-04-05	\N	Open	Salim Al Harthi	Facilities	6.0		2026-03-27 21:24:55.631911+05:30
WO-2026-005	MSQ-002-F02-HVC001	HVAC Unit — Convenience Store	Planned	Medium	Quarterly filter cleaning and refrigerant check	2026-03-28	\N	Open	Ibrahim Al Amri	Facilities	3.0		2026-03-27 21:24:55.631911+05:30
WO-2026-006	SLL-003-F04-TRN001	Transformer Unit	Planned	High	Bi-annual thermal imaging and connection torque check	2026-04-12	\N	Open	Ahmed Al Rashdi	Infrastructure	5.0		2026-03-27 21:24:55.631911+05:30
\.


--
-- Data for Name: portal_apps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.portal_apps (id, name, description, icon, category, url, sso_enabled, allowed_roles, sort_order) FROM stdin;
APP-001	SAP	Enterprise resource planning — financials, procurement, and operations.	🏢	Enterprise	#	t	{Admin,Finance,Manager}	1
APP-002	Leave Portal	Apply for annual, sick, or emergency leave and track your balance.	🗓️	HR	#	f	{Admin,Manager,Finance,Employee}	2
APP-003	QHSE Portal	Report incidents, manage safety audits, and track QHSE KPIs.	🦺	QHSE	#	f	{Admin,Manager,Finance,Employee}	3
APP-004	IT Helpdesk	Raise IT support tickets and track resolution status.	🖥️	IT	#	f	{Admin,Manager,Finance,Employee}	4
APP-005	Procurement	Manage purchase requests, vendor quotes, and procurement workflows.	🛒	Procurement	#	t	{Admin,Finance,Manager}	5
APP-006	Finance Reports	Access monthly P&L, budget variance reports, and financial dashboards.	📊	Finance	#	t	{Admin,Finance}	6
APP-007	HR Portal	Employee directory, payslips, performance reviews, and onboarding.	👥	HR	#	t	{Admin,Manager,Finance,Employee}	7
APP-008	Training Portal	Browse and enrol in mandatory and elective training courses.	🎓	HR	#	f	{Admin,Manager,Finance,Employee}	8
APP-009	Asset Manager	Track real estate assets, utility bills, and compliance schedules.	🏗️	Operations	#	f	{Admin,Finance,Manager}	9
APP-010	Project Tracker	Monitor project milestones, resource allocation, and delivery status.	📋	Operations	#	f	{Admin,Finance,Manager}	10
APP-011	Document Hub	Central repository for policies, procedures, and corporate documents.	📁	Administration	#	f	{Admin,Manager,Finance,Employee}	11
APP-012	Admin Console	User management, system configuration, and access control settings.	⚙️	Administration	#	f	{Admin}	12
\.


--
-- Data for Name: pr_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pr_documents (id, pr_id, name, type, size, uploaded_by, uploaded_at) FROM stdin;
DOC-001	PR-2026-002	Generator_Quote_AlMaha.pdf	Quote	245 KB	Sara Al Harthi	2026-02-14
DOC-002	PR-2026-002	Generator_Quote_OmanPower.pdf	Quote	189 KB	Sara Al Harthi	2026-02-14
DOC-003	PR-2026-002	TechnicalScope_Generators.docx	Scope	78 KB	Sara Al Harthi	2026-02-15
DOC-004	PR-2026-003	TankReplacement_Quote1.pdf	Quote	312 KB	Khalid Al Rashdi	2026-03-01
DOC-005	PR-2026-003	TankReplacement_Quote2.pdf	Quote	298 KB	Khalid Al Rashdi	2026-03-01
DOC-006	PR-2026-003	TankReplacement_Quote3.pdf	Quote	276 KB	Khalid Al Rashdi	2026-03-01
DOC-007	PR-2026-003	EngineeringAssessment.pdf	Technical	1.2 MB	Khalid Al Rashdi	2026-03-02
DOC-008	PR-2026-005	CCTV_Quote_SecureTech.pdf	Quote	156 KB	Rashid Al Ghafri	2026-01-22
DOC-009	PR-2026-005	CCTV_Quote_AlNoor.pdf	Quote	143 KB	Rashid Al Ghafri	2026-01-22
DOC-010	PR-2026-005	CCTV_Quote_VisionPro.pdf	Quote	167 KB	Rashid Al Ghafri	2026-01-22
\.


--
-- Data for Name: purchase_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_requests (id, title, description, requestor_name, requestor_id, department, total_value, tier, status, quote_count, requires_justification, justification, line_items, approval_history, created_at) FROM stdin;
PR-2026-001	Office Supplies Q1	Stationery and consumables for the admin department for Q1 2026.	Ahmed Al Balushi	\N	Admin	1500.00	LOW	APPROVED	3	f		[]	[{"date": "2026-01-11", "comment": "Routine supplies, approved.", "approver": "Sara Al Harthi", "decision": "APPROVED"}]	2026-01-10
PR-2026-002	Generator Maintenance Equipment	Spare parts and servicing tools for station backup generators across Muscat region.	Sara Al Harthi	\N	Operations	85000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-02-14
PR-2026-003	Fuel Storage Tank Replacement	Full replacement of aged underground fuel storage tanks at Al Khuwair station.	Khalid Al Rashdi	\N	Retail	450000.00	HIGH	PENDING_APPROVAL	4	f		[]	[{"date": "2026-03-03", "comment": "Dept manager approved. Escalating to Finance.", "approver": "Ahmed Al Balushi", "decision": "APPROVED"}]	2026-03-01
PR-2026-004	IT Hardware Refresh	Replacement laptops and monitors for the IT team — end of lifecycle.	Fatma Al Maamari	\N	IT	22000.00	LOW	DRAFT	1	t	Only 1 quote obtained so far — 2 more in progress.	[]	[]	2026-03-10
PR-2026-005	CCTV Upgrade — Salalah Stations	Installation of HD CCTV cameras across 3 Salalah stations for QHSE compliance.	Rashid Al Ghafri	\N	QHSE	67500.00	MEDIUM	APPROVED	3	f		[]	[{"date": "2026-01-25", "comment": "Budget available, QHSE priority.", "approver": "Sara Al Harthi", "decision": "APPROVED"}, {"date": "2026-01-27", "comment": "Final approval granted.", "approver": "Admin User", "decision": "APPROVED"}]	2026-01-22
PR-2026-006	Fleet Vehicle Leasing — 5 Units	Annual lease for 5 field inspection vehicles for the infrastructure team.	Maryam Al Lawati	\N	Infrastructure	312000.00	HIGH	REJECTED	3	f		[]	[{"date": "2026-02-05", "comment": "Budget freeze in effect for Q1. Resubmit in Q2.", "approver": "Sara Al Harthi", "decision": "REJECTED"}]	2026-02-01
PR-2026-007	Safety Signage Rebranding	Replace all station safety and brand signage to new Shell global standard.	Ahmed Al Balushi	\N	Retail	18400.00	LOW	APPROVED	3	f		[]	[{"date": "2026-02-22", "comment": "Approved — brand compliance requirement.", "approver": "Sara Al Harthi", "decision": "APPROVED"}]	2026-02-20
PR-2026-008	Canopy Structural Inspection	Third-party structural inspection of canopies at 12 stations per regulatory schedule.	Rashid Al Ghafri	\N	QHSE	9800.00	LOW	PENDING_APPROVAL	2	t	Third quote delayed by vendor — expected within 5 days.	[]	[]	2026-03-12
PR-2026-009	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-010	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-011	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-012	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-013	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-014	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-27
PR-2026-015	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-016	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-017	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-018	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-019	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-020	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-021	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-27
PR-2026-022	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-023	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-024	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-025	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-026	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-027	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-028	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-27
PR-2026-029	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-27
PR-2026-030	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-031	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-032	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-033	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-034	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-035	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-28
PR-2026-036	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-037	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-038	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-039	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-040	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-041	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-042	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-28
PR-2026-043	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-28
PR-2026-044	Test PR	Test	manager@shell.om	\N	Operations	25000.00	LOW	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
PR-2026-045	Test PR	Test	manager@shell.om	\N	Operations	150000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
PR-2026-046	Test PR	Test	manager@shell.om	\N	Operations	500000.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
PR-2026-047	Test PR	Test	manager@shell.om	\N	Operations	25001.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
PR-2026-048	Test PR	Test	manager@shell.om	\N	Operations	300001.00	HIGH	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
PR-2026-049	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	2	t		[]	[]	2026-03-30
PR-2026-050	Test PR	Test	manager@shell.om	\N	Operations	50000.00	MEDIUM	PENDING_APPROVAL	3	f		[]	[]	2026-03-30
\.


--
-- Data for Name: som_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.som_permissions (id, user_id, level, resource_key, can_view, can_create, can_edit, can_delete, created_at) FROM stdin;
c516e5e6-67c2-4588-aff0-7f76818dfc23	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	application	capex	t	t	t	t	2026-03-27 19:33:46.157844+05:30
9dc03b44-d2bf-49b5-9c56-775dedc46c19	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	module	capex.planning	t	t	t	t	2026-03-27 19:33:46.157844+05:30
bfa945be-5fc4-4c43-aef8-98a363c7ca8b	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	page	capex.planning.dashboard	t	t	t	t	2026-03-27 19:33:46.157844+05:30
c95c82f4-0d6e-4acc-a74c-389610662959	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.dashboard.budget_amount	t	t	t	t	2026-03-27 19:33:46.157844+05:30
e9833742-edd4-4f71-a9b0-a8bf52c824ca	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.dashboard.actual_spend	t	t	t	t	2026-03-27 19:33:46.157844+05:30
dcad2dae-b9cb-42ca-89a2-5029fbff0119	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.dashboard.variance	t	t	t	t	2026-03-27 19:33:46.157844+05:30
c8365348-15c6-4c06-8bbf-73f0c768f6d7	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	page	capex.planning.initiation-form	t	t	t	t	2026-03-27 19:33:46.157844+05:30
f3c18071-a1d1-4d8e-a74d-f1800c968e3d	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.initiation-form.amount	t	t	t	t	2026-03-27 19:33:46.157844+05:30
da970df3-d196-4c6a-86c8-0193f229e25e	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.initiation-form.description	t	t	t	t	2026-03-27 19:33:46.157844+05:30
5f78a1a0-b552-4d66-ba00-5ff7d4780db4	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.planning.initiation-form.department	t	t	t	t	2026-03-27 19:33:46.157844+05:30
14015a45-2d1f-4d85-8269-23aaa89281b5	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	module	capex.tracking	t	t	t	t	2026-03-27 19:33:46.157844+05:30
e02b2fbb-a8a2-4ddd-9127-3ffc625353c1	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	page	capex.tracking.budget-tracker	t	t	t	t	2026-03-27 19:33:46.157844+05:30
515ebdd1-d7c6-426f-95b6-e2c5a6a3ccce	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.tracking.budget-tracker.actuals	t	t	t	t	2026-03-27 19:33:46.157844+05:30
8eea3bfd-d10c-4175-b7e1-d07347cc6690	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.tracking.budget-tracker.committed	t	t	t	t	2026-03-27 19:33:46.157844+05:30
c78e7f8e-4d3d-43fe-90c3-f41c68e0e594	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	page	capex.tracking.manual-entry	t	t	t	t	2026-03-27 19:33:46.157844+05:30
bd8f2a26-ba0c-45d6-8ff5-3416dc32c215	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.tracking.manual-entry.amount	t	t	t	t	2026-03-27 19:33:46.157844+05:30
334eacd3-2e9a-4365-82bf-2ae90e9d9d15	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	field	capex.tracking.manual-entry.reference	t	t	t	t	2026-03-27 19:33:46.157844+05:30
2b1ea29c-ce77-4e00-8017-bc06297260be	17995476-7e88-4ef1-8fbf-e1adbf1db374	application	capex	t	t	t	t	2026-04-03 23:13:52.089987+05:30
2b6e003d-cdcc-4074-8b29-fa4a378ad105	17995476-7e88-4ef1-8fbf-e1adbf1db374	module	capex.planning	t	t	t	t	2026-04-03 23:13:52.089987+05:30
24b131dc-153e-4553-b5e7-fd03980c0b53	17995476-7e88-4ef1-8fbf-e1adbf1db374	page	capex.planning.dashboard	t	t	t	t	2026-04-03 23:13:52.089987+05:30
ccc389a5-5925-4237-89ce-0ed163891472	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.total_budget	t	t	t	t	2026-04-03 23:13:52.089987+05:30
f907f6c9-7366-4bd0-80fb-a46aa3649300	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.committed	t	t	t	t	2026-04-03 23:13:52.089987+05:30
b4b3dbfe-06f5-48a6-8440-ca6a8cbc96aa	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.actual	t	t	t	t	2026-04-03 23:13:52.089987+05:30
ddb92c02-e480-4a41-8eca-1d58c3926f44	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.remaining	t	t	t	t	2026-04-03 23:13:52.089987+05:30
f28f83a3-da5c-45b4-858e-490d80850087	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.percent_used	t	t	t	t	2026-04-03 23:13:52.089987+05:30
63077ef2-05b1-4854-ba62-28660df52dc6	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.dashboard.monthly_chart	t	t	t	t	2026-04-03 23:13:52.089987+05:30
3ad896c4-cf6d-4d9d-9ac3-e2ab9c9033d3	17995476-7e88-4ef1-8fbf-e1adbf1db374	page	capex.planning.departments	t	t	t	t	2026-04-03 23:13:52.089987+05:30
a6a06e8d-9248-479a-b29f-67a4659cce4a	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.total_budget	t	t	t	t	2026-04-03 23:13:52.089987+05:30
9d639719-680c-48ea-9b56-0ae9aceefa53	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.committed	t	t	t	t	2026-04-03 23:13:52.089987+05:30
ef0ea233-3d4e-4da2-8ad6-4c38b1c878de	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.actual	t	t	t	t	2026-04-03 23:13:52.089987+05:30
98ad6062-d2b9-40ea-88bc-57e2e747eb4c	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.remaining	t	t	t	t	2026-04-03 23:13:52.089987+05:30
37f6d423-9435-49c6-804e-284f0b250ca0	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.percent_used	t	t	t	t	2026-04-03 23:13:52.089987+05:30
6fdbcf38-8786-4767-94d8-35960cc06809	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.planning.departments.monthly_chart	t	t	t	t	2026-04-03 23:13:52.089987+05:30
190d63b1-1f88-4777-9640-f42c18ea9e89	17995476-7e88-4ef1-8fbf-e1adbf1db374	module	capex.tracking	f	t	t	t	2026-04-03 23:13:52.089987+05:30
cb79fde3-211a-4ee7-8d65-033aa4290945	17995476-7e88-4ef1-8fbf-e1adbf1db374	page	capex.tracking.manual-entry	t	t	t	t	2026-04-03 23:13:52.089987+05:30
b66846c0-53ab-44c7-a305-31a4d44f21b1	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.entry_type	t	f	f	f	2026-04-03 23:13:52.089987+05:30
077a7e30-e56b-4f97-8494-124941cf15f9	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.department	t	f	f	f	2026-04-03 23:13:52.089987+05:30
2e7d199d-016f-4bff-9db1-a43a7da44269	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.period	t	f	f	f	2026-04-03 23:13:52.089987+05:30
97b9ea30-65f1-448d-887b-2909408a0a06	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.amount	t	t	t	t	2026-04-03 23:13:52.089987+05:30
357f1bc5-b7a1-4f71-ada8-da65919928b9	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.description	t	f	f	f	2026-04-03 23:13:52.089987+05:30
896c364b-95d9-4883-9f24-459accd5eb6a	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.reference_number	t	f	f	f	2026-04-03 23:13:52.089987+05:30
36534085-7391-47dc-b5ca-b647a9556262	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.entered_by	t	f	f	f	2026-04-03 23:13:52.089987+05:30
a7213be0-580c-44cb-8fef-38333cb093e4	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	capex.tracking.manual-entry.status	t	f	f	f	2026-04-03 23:13:52.089987+05:30
919fe264-ef0c-417e-a362-ce1999798319	17995476-7e88-4ef1-8fbf-e1adbf1db374	application	purchase-requests	t	f	f	f	2026-04-03 23:13:52.089987+05:30
32cadf62-310c-43e5-aa09-de9160881c80	17995476-7e88-4ef1-8fbf-e1adbf1db374	module	purchase-requests.requests	t	f	f	f	2026-04-03 23:13:52.089987+05:30
810c604b-e150-4dd8-886f-329c759a3e89	17995476-7e88-4ef1-8fbf-e1adbf1db374	page	purchase-requests.requests.detail	t	f	f	f	2026-04-03 23:13:52.089987+05:30
0fcbe16c-763e-44be-b9e7-6dcd6d51ce6f	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.requestor_name	t	f	f	f	2026-04-03 23:13:52.089987+05:30
ffdbb181-04cc-4423-b29f-22252e81b738	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.total_value	t	f	f	f	2026-04-03 23:13:52.089987+05:30
00d46130-aef2-4241-bc37-ae4435f18778	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.tier	t	f	f	f	2026-04-03 23:13:52.089987+05:30
a6b0564d-2634-45db-832f-0eb158b7696a	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.quote_count	t	f	f	f	2026-04-03 23:13:52.089987+05:30
678954e2-2d5f-4c26-81b3-641fd5073a60	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.description	t	f	f	f	2026-04-03 23:13:52.089987+05:30
ada99e87-d4b6-4b93-90c2-8954648ea96b	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.justification	t	f	f	f	2026-04-03 23:13:52.089987+05:30
6a479b58-8364-4bc8-8eb8-884e098e1f80	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.line_items	t	f	f	f	2026-04-03 23:13:52.089987+05:30
970ed572-b6f7-4838-954c-1e6d28dce76d	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.requests.detail.approval_history	t	f	f	f	2026-04-03 23:13:52.089987+05:30
a114b911-10ba-463f-bc5d-b858f1fb2ddc	17995476-7e88-4ef1-8fbf-e1adbf1db374	module	purchase-requests.approvals	t	f	f	f	2026-04-03 23:13:52.089987+05:30
23dfdfd1-a937-44f5-b10a-35d262fda3f3	17995476-7e88-4ef1-8fbf-e1adbf1db374	page	purchase-requests.approvals.queue	t	f	f	f	2026-04-03 23:13:52.089987+05:30
2511a5a7-b7bd-47c9-a981-39426b51dcca	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.approvals.queue.decision	t	f	f	f	2026-04-03 23:13:52.089987+05:30
baf1cf16-090e-47ea-83e0-5222e37a2b2c	17995476-7e88-4ef1-8fbf-e1adbf1db374	field	purchase-requests.approvals.queue.comment	t	f	f	f	2026-04-03 23:13:52.089987+05:30
\.


--
-- Data for Name: som_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.som_users (id, employee_id, full_name, email, password_hash, role, department, is_active, created_by, created_at, updated_at) FROM stdin;
3b4956b2-f829-4d8c-a1ca-d181856bf3ec	EMP-0001	SOM Administrator	admin@shell.om	$2b$12$fe8qr88QMalaerOib/8NgeapqogDDNQI9qrnGBpKREr8aI2u.5ZYy	Admin	IT	t	\N	2026-03-27 19:12:17.164895+05:30	2026-03-27 19:33:46.157844+05:30
17995476-7e88-4ef1-8fbf-e1adbf1db374	EMP-002	Rinsad Ahamed	rinsad@gmail.com	$2b$12$OdrtEeti4Dwi7oefgJdq0u79JdOogI4CMFL9sX5Eaj4hjcJpS.SwG	Employee		t	3b4956b2-f829-4d8c-a1ca-d181856bf3ec	2026-03-27 19:39:20.305433+05:30	2026-03-28 07:32:29.172888+05:30
\.


--
-- Data for Name: user_favourites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_favourites (user_id, app_id) FROM stdin;
1	APP-TEST-001
\.


--
-- Data for Name: user_pinned_docs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_pinned_docs (user_id, doc_id) FROM stdin;
\.


--
-- Data for Name: utility_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility_bills (id, site_id, site_name, utility_type, period, amount, meter_reading, unit, created_at) FROM stdin;
UB-001	SITE-001	Al Khuwair Station	Electricity	2025-10	4800.00	142300.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-002	SITE-001	Al Khuwair Station	Electricity	2025-11	5100.00	147600.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-003	SITE-001	Al Khuwair Station	Electricity	2025-12	5400.00	153200.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-004	SITE-001	Al Khuwair Station	Electricity	2026-01	5250.00	158600.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-005	SITE-001	Al Khuwair Station	Electricity	2026-02	4950.00	163700.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-006	SITE-001	Al Khuwair Station	Electricity	2026-03	5050.00	168900.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-007	SITE-001	Al Khuwair Station	Water	2025-10	320.00	8400.00	m³	2026-03-27 21:24:55.631911+05:30
UB-008	SITE-001	Al Khuwair Station	Water	2025-11	295.00	8710.00	m³	2026-03-27 21:24:55.631911+05:30
UB-009	SITE-001	Al Khuwair Station	Water	2025-12	340.00	9060.00	m³	2026-03-27 21:24:55.631911+05:30
UB-010	SITE-001	Al Khuwair Station	Water	2026-01	310.00	9380.00	m³	2026-03-27 21:24:55.631911+05:30
UB-011	SITE-001	Al Khuwair Station	Water	2026-02	290.00	9680.00	m³	2026-03-27 21:24:55.631911+05:30
UB-012	SITE-001	Al Khuwair Station	Water	2026-03	305.00	9990.00	m³	2026-03-27 21:24:55.631911+05:30
UB-013	SITE-003	Salalah Main Station	Electricity	2025-10	3800.00	98200.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-014	SITE-003	Salalah Main Station	Electricity	2025-11	4100.00	102400.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-015	SITE-003	Salalah Main Station	Electricity	2025-12	4400.00	106900.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-016	SITE-003	Salalah Main Station	Electricity	2026-01	4200.00	111200.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-017	SITE-003	Salalah Main Station	Electricity	2026-02	3950.00	115300.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-018	SITE-003	Salalah Main Station	Electricity	2026-03	4050.00	119500.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-019	SITE-003	Salalah Main Station	Gas	2025-10	620.00	21400.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-020	SITE-003	Salalah Main Station	Gas	2025-11	680.00	22100.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-021	SITE-003	Salalah Main Station	Gas	2025-12	720.00	22850.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-022	SITE-003	Salalah Main Station	Gas	2026-01	695.00	23580.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-023	SITE-003	Salalah Main Station	Gas	2026-02	640.00	24250.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-024	SITE-003	Salalah Main Station	Gas	2026-03	660.00	24940.00	MJ	2026-03-27 21:24:55.631911+05:30
UB-025	SITE-004	Sohar Industrial Station	Electricity	2025-10	6200.00	201000.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-026	SITE-004	Sohar Industrial Station	Electricity	2025-11	6500.00	207600.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-027	SITE-004	Sohar Industrial Station	Electricity	2025-12	6800.00	214500.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-028	SITE-004	Sohar Industrial Station	Electricity	2026-01	6600.00	221200.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-029	SITE-004	Sohar Industrial Station	Electricity	2026-02	6300.00	227600.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-030	SITE-004	Sohar Industrial Station	Electricity	2026-03	6450.00	234100.00	kWh	2026-03-27 21:24:55.631911+05:30
UB-031	MSQ-001		Electricity	Mar 2026	12500.00	84200.00		2026-03-27 21:33:42.718701+05:30
\.


--
-- Name: capex_budget_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.capex_budget_uploads_id_seq', 1, false);


--
-- Name: capex_department_monthly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.capex_department_monthly_id_seq', 192, true);


--
-- Name: capex_departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.capex_departments_id_seq', 32, true);


--
-- Name: gsap_approved_budgets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gsap_approved_budgets_id_seq', 32, true);


--
-- Name: kb_chunks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kb_chunks_id_seq', 34, true);


--
-- Name: kb_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kb_versions_id_seq', 103, true);


--
-- Name: asset_compliance_alerts asset_compliance_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_compliance_alerts
    ADD CONSTRAINT asset_compliance_alerts_pkey PRIMARY KEY (alert_id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (asset_code);


--
-- Name: capex_budget_uploads capex_budget_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_budget_uploads
    ADD CONSTRAINT capex_budget_uploads_pkey PRIMARY KEY (id);


--
-- Name: capex_department_monthly capex_department_monthly_department_id_month_label_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_department_monthly
    ADD CONSTRAINT capex_department_monthly_department_id_month_label_key UNIQUE (department_id, month_label);


--
-- Name: capex_department_monthly capex_department_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_department_monthly
    ADD CONSTRAINT capex_department_monthly_pkey PRIMARY KEY (id);


--
-- Name: capex_departments capex_departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_departments
    ADD CONSTRAINT capex_departments_name_key UNIQUE (name);


--
-- Name: capex_departments capex_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_departments
    ADD CONSTRAINT capex_departments_pkey PRIMARY KEY (id);


--
-- Name: capex_initiations capex_initiations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_initiations
    ADD CONSTRAINT capex_initiations_pkey PRIMARY KEY (id);


--
-- Name: capex_manual_entries capex_manual_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_manual_entries
    ADD CONSTRAINT capex_manual_entries_pkey PRIMARY KEY (id);


--
-- Name: gsap_approved_budgets gsap_approved_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gsap_approved_budgets
    ADD CONSTRAINT gsap_approved_budgets_pkey PRIMARY KEY (id);


--
-- Name: gsap_approved_budgets gsap_approved_budgets_wbs_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gsap_approved_budgets
    ADD CONSTRAINT gsap_approved_budgets_wbs_code_key UNIQUE (wbs_code);


--
-- Name: gsap_sync_status gsap_sync_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gsap_sync_status
    ADD CONSTRAINT gsap_sync_status_pkey PRIMARY KEY (id);


--
-- Name: kb_chunks kb_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_chunks
    ADD CONSTRAINT kb_chunks_pkey PRIMARY KEY (id);


--
-- Name: kb_versions kb_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_versions
    ADD CONSTRAINT kb_versions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: maintenance_work_orders maintenance_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_pkey PRIMARY KEY (id);


--
-- Name: portal_apps portal_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_apps
    ADD CONSTRAINT portal_apps_pkey PRIMARY KEY (id);


--
-- Name: pr_documents pr_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pr_documents
    ADD CONSTRAINT pr_documents_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: som_permissions som_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_permissions
    ADD CONSTRAINT som_permissions_pkey PRIMARY KEY (id);


--
-- Name: som_permissions som_permissions_user_id_resource_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_permissions
    ADD CONSTRAINT som_permissions_user_id_resource_key_key UNIQUE (user_id, resource_key);


--
-- Name: som_users som_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_users
    ADD CONSTRAINT som_users_email_key UNIQUE (email);


--
-- Name: som_users som_users_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_users
    ADD CONSTRAINT som_users_employee_id_key UNIQUE (employee_id);


--
-- Name: som_users som_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_users
    ADD CONSTRAINT som_users_pkey PRIMARY KEY (id);


--
-- Name: user_favourites user_favourites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favourites
    ADD CONSTRAINT user_favourites_pkey PRIMARY KEY (user_id, app_id);


--
-- Name: user_pinned_docs user_pinned_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_pinned_docs
    ADD CONSTRAINT user_pinned_docs_pkey PRIMARY KEY (user_id, doc_id);


--
-- Name: utility_bills utility_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_bills
    ADD CONSTRAINT utility_bills_pkey PRIMARY KEY (id);


--
-- Name: utility_bills utility_bills_site_id_utility_type_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_bills
    ADD CONSTRAINT utility_bills_site_id_utility_type_period_key UNIQUE (site_id, utility_type, period);


--
-- Name: idx_assets_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_region ON public.assets USING btree (region);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_bills_site; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bills_site ON public.utility_bills USING btree (site_id);


--
-- Name: idx_kb_chunks_doc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_chunks_doc ON public.kb_chunks USING btree (doc_id);


--
-- Name: idx_kb_chunks_tsv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_chunks_tsv ON public.kb_chunks USING gin (tsv);


--
-- Name: idx_kb_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_title_trgm ON public.knowledge_base USING gin (title public.gin_trgm_ops);


--
-- Name: idx_kb_versions_doc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_versions_doc ON public.kb_versions USING btree (doc_id);


--
-- Name: idx_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_user_id ON public.som_permissions USING btree (user_id);


--
-- Name: idx_pr_docs_pr_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pr_docs_pr_id ON public.pr_documents USING btree (pr_id);


--
-- Name: idx_prs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prs_status ON public.purchase_requests USING btree (status);


--
-- Name: som_users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.som_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: asset_compliance_alerts asset_compliance_alerts_asset_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_compliance_alerts
    ADD CONSTRAINT asset_compliance_alerts_asset_code_fkey FOREIGN KEY (asset_code) REFERENCES public.assets(asset_code) ON DELETE CASCADE;


--
-- Name: capex_department_monthly capex_department_monthly_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_department_monthly
    ADD CONSTRAINT capex_department_monthly_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.capex_departments(id) ON DELETE CASCADE;


--
-- Name: capex_initiations capex_initiations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_initiations
    ADD CONSTRAINT capex_initiations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.som_users(id);


--
-- Name: capex_manual_entries capex_manual_entries_entered_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capex_manual_entries
    ADD CONSTRAINT capex_manual_entries_entered_by_id_fkey FOREIGN KEY (entered_by_id) REFERENCES public.som_users(id);


--
-- Name: kb_chunks kb_chunks_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_chunks
    ADD CONSTRAINT kb_chunks_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.knowledge_base(id) ON DELETE CASCADE;


--
-- Name: kb_versions kb_versions_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_versions
    ADD CONSTRAINT kb_versions_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.knowledge_base(id) ON DELETE CASCADE;


--
-- Name: maintenance_work_orders maintenance_work_orders_asset_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_asset_code_fkey FOREIGN KEY (asset_code) REFERENCES public.assets(asset_code);


--
-- Name: pr_documents pr_documents_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pr_documents
    ADD CONSTRAINT pr_documents_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id) ON DELETE CASCADE;


--
-- Name: purchase_requests purchase_requests_requestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_requestor_id_fkey FOREIGN KEY (requestor_id) REFERENCES public.som_users(id);


--
-- Name: som_permissions som_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.som_permissions
    ADD CONSTRAINT som_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.som_users(id) ON DELETE CASCADE;


--
-- Name: user_pinned_docs user_pinned_docs_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_pinned_docs
    ADD CONSTRAINT user_pinned_docs_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.knowledge_base(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jpCyuGQswOAjhqYZJJ4RkZ0xXahiJG3Wv3puLa24zwSICrriBy4uGtJ3VSRMgyj

