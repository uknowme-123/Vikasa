-- Vikasa sensor readings schema.
-- Source of truth: backend/app/schemas/sensor.py and
-- backend/app/services/supabase_storage.py.

create table public.readings (
    reading_id text primary key,
    plant_id text not null,
    session_id text not null,
    timestamp timestamptz not null,
    species text,
    stress_type text,
    health_label text,
    label_evidence text,
    red_raw integer,
    nir_raw integer,
    red_dark integer,
    nir_dark integer,
    red_reference integer,
    nir_reference integer,
    red_reflectance double precision,
    nir_reflectance double precision,
    ndvi double precision,
    temperature_c double precision,
    humidity_pct double precision,
    soil_moisture_raw integer,
    soil_moisture_pct double precision,
    ambient_light_raw integer,
    operator_id text not null,
    notes text,
    created_at timestamptz not null default now(),

    constraint readings_reading_id_length
        check (char_length(reading_id) between 1 and 64),
    constraint readings_plant_id_length
        check (char_length(plant_id) between 1 and 64),
    constraint readings_session_id_length
        check (char_length(session_id) between 1 and 64),
    constraint readings_operator_id_length
        check (char_length(operator_id) between 1 and 64),
    constraint readings_species_length
        check (species is null or char_length(species) <= 128),
    constraint readings_stress_type_length
        check (stress_type is null or char_length(stress_type) <= 32),
    constraint readings_health_label_length
        check (health_label is null or char_length(health_label) <= 32),
    constraint readings_label_evidence_length
        check (label_evidence is null or char_length(label_evidence) <= 256),
    constraint readings_notes_length
        check (notes is null or char_length(notes) <= 512),

    constraint readings_red_raw_range
        check (red_raw is null or red_raw between 0 and 65535),
    constraint readings_nir_raw_range
        check (nir_raw is null or nir_raw between 0 and 65535),
    constraint readings_red_dark_range
        check (red_dark is null or red_dark between 0 and 65535),
    constraint readings_nir_dark_range
        check (nir_dark is null or nir_dark between 0 and 65535),
    constraint readings_red_reference_range
        check (red_reference is null or red_reference between 0 and 65535),
    constraint readings_nir_reference_range
        check (nir_reference is null or nir_reference between 0 and 65535),
    constraint readings_soil_moisture_raw_range
        check (soil_moisture_raw is null or soil_moisture_raw between 0 and 65535),
    constraint readings_ambient_light_raw_range
        check (ambient_light_raw is null or ambient_light_raw between 0 and 65535),
    constraint readings_red_reflectance_range
        check (red_reflectance is null or red_reflectance between 0 and 100),
    constraint readings_nir_reflectance_range
        check (nir_reflectance is null or nir_reflectance between 0 and 100),
    constraint readings_ndvi_range
        check (ndvi is null or ndvi between -1 and 1),
    constraint readings_temperature_range
        check (temperature_c is null or temperature_c between -50 and 100),
    constraint readings_humidity_range
        check (humidity_pct is null or humidity_pct between 0 and 100),
    constraint readings_soil_moisture_pct_range
        check (soil_moisture_pct is null or soil_moisture_pct between 0 and 100),

    constraint readings_reflectance_pair
        check (
            (red_reflectance is null and nir_reflectance is null)
            or (red_reflectance is not null and nir_reflectance is not null)
        ),
    constraint readings_ndvi_requires_reflectance
        check (
            ndvi is null
            or (red_reflectance is not null and nir_reflectance is not null)
        )
);

create index readings_timestamp_idx
    on public.readings (timestamp desc);

create index readings_plant_timestamp_idx
    on public.readings (plant_id, timestamp desc);

create index readings_session_timestamp_idx
    on public.readings (session_id, timestamp desc);
