--
-- PostgreSQL database dump
--

\restrict RXRA1Vjg7vkzbwebQYPnaTELLCfaw4cLFj9p4ARSbg6XBL2VSOh8FdwHnM4xHvl

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-07-19 12:40:40

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 24625)
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    part_number character varying(100) NOT NULL,
    quantity_on_hand integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT inventory_quantity_check CHECK ((quantity_on_hand >= 0))
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24606)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    order_item_id bigint NOT NULL,
    order_id bigint NOT NULL,
    part_number character varying(100) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24605)
-- Name: order_items_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ALTER COLUMN order_item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_order_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 24578)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    order_id bigint NOT NULL,
    customer_name character varying(150) NOT NULL,
    customer_email character varying(255) NOT NULL,
    shipping_address text NOT NULL,
    order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'authorized'::character varying NOT NULL,
    authorization_number character varying(100) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    shipping_charge numeric(10,2) NOT NULL,
    handling_charge numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    shipped_at timestamp with time zone,
    card_last_four character varying(4),
    CONSTRAINT orders_handling_charge_check CHECK ((handling_charge >= (0)::numeric)),
    CONSTRAINT orders_shipping_charge_check CHECK ((shipping_charge >= (0)::numeric)),
    CONSTRAINT orders_shipping_status_check CHECK (((((status)::text = 'authorized'::text) AND (shipped_at IS NULL)) OR (((status)::text = 'shipped'::text) AND (shipped_at IS NOT NULL)))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['authorized'::character varying, 'shipped'::character varying])::text[]))),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT orders_total_calculation_check CHECK ((total_amount = ((subtotal + shipping_charge) + handling_charge)))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24577)
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ALTER COLUMN order_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 24637)
-- Name: shipping_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_rates (
    rate_id bigint NOT NULL,
    min_weight numeric(10,2) NOT NULL,
    max_weight numeric(10,2) NOT NULL,
    shipping_charge numeric(10,2) NOT NULL,
    handling_charge numeric(10,2) NOT NULL,
    CONSTRAINT shipping_rates_handling_charge_check CHECK ((handling_charge >= (0)::numeric)),
    CONSTRAINT shipping_rates_min_weight_check CHECK ((min_weight >= (0)::numeric)),
    CONSTRAINT shipping_rates_shipping_charge_check CHECK ((shipping_charge >= (0)::numeric)),
    CONSTRAINT shipping_rates_weight_range_check CHECK ((max_weight > min_weight))
);


ALTER TABLE public.shipping_rates OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24636)
-- Name: shipping_rates_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.shipping_rates ALTER COLUMN rate_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.shipping_rates_rate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5052 (class 0 OID 24625)
-- Dependencies: 223
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (part_number, quantity_on_hand, updated_at) FROM stdin;
PART-1001	25	2026-07-19 08:32:56.057244-05
PART-1002	15	2026-07-19 08:32:56.057244-05
PART-1003	40	2026-07-19 08:32:56.057244-05
\.


--
-- TOC entry 5051 (class 0 OID 24606)
-- Dependencies: 222
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (order_item_id, order_id, part_number, quantity, unit_price) FROM stdin;
1	1	PART-1001	2	50.00
\.


--
-- TOC entry 5049 (class 0 OID 24578)
-- Dependencies: 220
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (order_id, customer_name, customer_email, shipping_address, order_date, status, authorization_number, subtotal, shipping_charge, handling_charge, total_amount, shipped_at, card_last_four) FROM stdin;
1	John Smith	john@gmail.com	123 Main St, Chicago, IL	2026-07-19 08:29:05.729079-05	authorized	AUTH123456	100.00	10.00	5.00	115.00	\N	\N
\.


--
-- TOC entry 5054 (class 0 OID 24637)
-- Dependencies: 225
-- Data for Name: shipping_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_rates (rate_id, min_weight, max_weight, shipping_charge, handling_charge) FROM stdin;
1	0.00	5.00	7.99	2.00
2	5.00	10.00	12.99	3.00
3	10.00	20.00	18.99	4.00
4	20.00	50.00	29.99	6.00
\.


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 221
-- Name: order_items_order_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_order_item_id_seq', 1, true);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 219
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 1, true);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 224
-- Name: shipping_rates_rate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shipping_rates_rate_id_seq', 4, true);


--
-- TOC entry 4895 (class 2606 OID 24635)
-- Name: inventory inventory_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pk PRIMARY KEY (part_number);


--
-- TOC entry 4891 (class 2606 OID 24619)
-- Name: order_items order_items_order_part_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_part_unique UNIQUE (order_id, part_number);


--
-- TOC entry 4893 (class 2606 OID 24617)
-- Name: order_items order_items_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pk PRIMARY KEY (order_item_id);


--
-- TOC entry 4889 (class 2606 OID 24604)
-- Name: orders orders_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pk PRIMARY KEY (order_id);


--
-- TOC entry 4897 (class 2606 OID 24650)
-- Name: shipping_rates shipping_rates_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_pk PRIMARY KEY (rate_id);


--
-- TOC entry 4899 (class 2606 OID 24652)
-- Name: shipping_rates shipping_rates_unique_bracket; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_unique_bracket UNIQUE (min_weight, max_weight);


--
-- TOC entry 4900 (class 2606 OID 24620)
-- Name: order_items order_items_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


-- Completed on 2026-07-19 12:40:40

--
-- PostgreSQL database dump complete
--

\unrestrict RXRA1Vjg7vkzbwebQYPnaTELLCfaw4cLFj9p4ARSbg6XBL2VSOh8FdwHnM4xHvl

