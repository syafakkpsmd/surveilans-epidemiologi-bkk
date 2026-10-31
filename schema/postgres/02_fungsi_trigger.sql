-- schema/postgres/02_fungsi_trigger.sql  (DIBUAT OTOMATIS; definisi fungsi/trigger = ASLI Supabase/PostgreSQL)
-- Dikecualikan: is_admin() (RLS Supabase; otorisasi kini di server aplikasi). Dijalankan SETELAH 01_tabel.sql.

CREATE OR REPLACE FUNCTION epi_week_start(p_tahun integer, p_minggu integer)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  jan1 date;
  jan1_dow int;
  minggu1_mulai date;
BEGIN
  jan1 := make_date(p_tahun, 1, 1);
  jan1_dow := EXTRACT(DOW FROM jan1)::int;

  IF jan1_dow <= 3 THEN
    minggu1_mulai := jan1 - jan1_dow;
  ELSE
    minggu1_mulai := jan1 + (7 - jan1_dow);
  END IF;

  RETURN minggu1_mulai + (p_minggu - 1) * 7;
END;
$function$;

CREATE OR REPLACE FUNCTION mmwr_week(d date)
 RETURNS TABLE(tahun_epid integer, minggu_epid integer)
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  yr int;
  jan1 date;
  jan1_dow int;
  minggu1_mulai date;
  selisih_hari int;
BEGIN
  IF d IS NULL THEN
    RETURN;
  END IF;

  yr := EXTRACT(YEAR FROM d)::int;
  jan1 := make_date(yr, 1, 1);
  jan1_dow := EXTRACT(DOW FROM jan1)::int;

  IF jan1_dow <= 3 THEN
    minggu1_mulai := jan1 - jan1_dow;
  ELSE
    minggu1_mulai := jan1 + (7 - jan1_dow);
  END IF;

  IF d < minggu1_mulai THEN
    yr := yr - 1;
    jan1 := make_date(yr, 1, 1);
    jan1_dow := EXTRACT(DOW FROM jan1)::int;
    IF jan1_dow <= 3 THEN
      minggu1_mulai := jan1 - jan1_dow;
    ELSE
      minggu1_mulai := jan1 + (7 - jan1_dow);
    END IF;
  END IF;

  selisih_hari := d - minggu1_mulai;

  tahun_epid := yr;
  minggu_epid := (selisih_hari / 7) + 1;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION hitung_indikator_anopheles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.tipe_pengamatan = 'dewasa' and coalesce(new.jml_jam_tangkap,0) > 0 then
    new.mbr := round(coalesce(new.jml_nyamuk,0)::numeric / new.jml_jam_tangkap, 3);
    new.mhd := new.mbr;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION hitung_indikator_dbd()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.jml_rumah_diperiksa > 0 then
    new.hi  := round((new.jml_positif_jentik::numeric / new.jml_rumah_diperiksa) * 100, 2);
    new.abj := round((1 - new.jml_positif_jentik::numeric / new.jml_rumah_diperiksa) * 100, 2);
    new.bi  := round((coalesce(new.container_positif,0)::numeric / new.jml_rumah_diperiksa) * 100, 2);
  else
    new.hi := 0; new.abj := 0; new.bi := 0;
  end if;

  if coalesce(new.container_diperiksa,0) > 0 then
    new.ci := round((coalesce(new.container_positif,0)::numeric / new.container_diperiksa) * 100, 2);
  else
    new.ci := 0;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION hitung_indikator_diare()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.hasil_pengamatan := case
    when new.nilai_hasil_pengamatan < 2 then 'Memenuhi Syarat'
    else 'Tidak Memenuhi Syarat'
  end;

  if new.jenis_kegiatan = 'lalat' then
    new.fly_index := new.nilai_hasil_pengamatan;
    new.kepadatan_kecoa_per_m2 := null;
  else
    new.kepadatan_kecoa_per_m2 := new.nilai_hasil_pengamatan;
    new.fly_index := null;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION hitung_indikator_tikus()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.jml_trap_dipasang > 0 then
    new.tsi := round((new.jml_trap_tertangkap::numeric / new.jml_trap_dipasang) * 100, 2);
  else
    new.tsi := 0;
  end if;

  if coalesce(new.jml_trap_tertangkap, 0) > 0 then
    new.index_pinjal := round(
      coalesce(new.jml_pinjal_ditemukan, 0)::numeric / new.jml_trap_tertangkap, 2
    );
  else
    new.index_pinjal := 0;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION set_updated_at_lpn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION status_lapor_bulanan(p_tahun integer, p_bulan integer)
 RETURNS TABLE(kode_wilker text, kegiatan text, jumlah bigint)
 LANGUAGE sql
 STABLE
AS $function$
  select kode_wilker, 'DBD'::text, count(*)
  from vektor_dbd
  where extract(year from tgl_survei) = p_tahun
    and extract(month from tgl_survei) = p_bulan
    and kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  group by kode_wilker

  union all

  select kode_wilker, 'Tikus'::text, count(*)
  from vektor_tikus
  where extract(year from tgl_survei) = p_tahun
    and extract(month from tgl_survei) = p_bulan
    and kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  group by kode_wilker

  union all

  select kode_wilker, 'Anoph'::text, count(*)
  from vektor_anopheles
  where extract(year from tgl_survei) = p_tahun
    and extract(month from tgl_survei) = p_bulan
    and kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  group by kode_wilker

  union all

  -- Lalat: pecahan dari vektor_diare, jenis_kegiatan = 'lalat'
  select kode_wilker, 'Lalat'::text, count(*)
  from vektor_diare
  where extract(year from tgl_kegiatan) = p_tahun
    and extract(month from tgl_kegiatan) = p_bulan
    and lower(jenis_kegiatan) = 'lalat'
    and kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  group by kode_wilker

  union all

  -- Kecoa: pecahan dari vektor_diare, jenis_kegiatan = 'kecoa'
  select kode_wilker, 'Kecoa'::text, count(*)
  from vektor_diare
  where extract(year from tgl_kegiatan) = p_tahun
    and extract(month from tgl_kegiatan) = p_bulan
    and lower(jenis_kegiatan) = 'kecoa'
    and kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  group by kode_wilker

  union all

  -- TPP: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  select
    case wilayah_kerja
      when 'Samarinda' then 'WK01'
      when 'Tanjung Santan' then 'WK02'
      when 'Tanjung Laut' then 'WK03'
      when 'Lhoktuan' then 'WK04'
      when 'Sangatta' then 'WK05'
      when 'Sangkulirang' then 'WK06'
      when 'APT Pranoto' then 'WK07'
    end as kode_wilker,
    'TPP'::text,
    count(*)
  from tpp
  where extract(year from tanggal_kegiatan) = p_tahun
    and extract(month from tanggal_kegiatan) = p_bulan
    and wilayah_kerja in ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')
  group by wilayah_kerja

  union all

  -- TTU: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  select
    case wilayah_kerja
      when 'Samarinda' then 'WK01'
      when 'Tanjung Santan' then 'WK02'
      when 'Tanjung Laut' then 'WK03'
      when 'Lhoktuan' then 'WK04'
      when 'Sangatta' then 'WK05'
      when 'Sangkulirang' then 'WK06'
      when 'APT Pranoto' then 'WK07'
    end as kode_wilker,
    'TTU'::text,
    count(*)
  from ttu
  where extract(year from tanggal) = p_tahun
    and extract(month from tanggal) = p_bulan
    and wilayah_kerja in ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')
  group by wilayah_kerja

  union all

  -- PAB: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  select
    case wilayah_kerja
      when 'Samarinda' then 'WK01'
      when 'Tanjung Santan' then 'WK02'
      when 'Tanjung Laut' then 'WK03'
      when 'Lhoktuan' then 'WK04'
      when 'Sangatta' then 'WK05'
      when 'Sangkulirang' then 'WK06'
      when 'APT Pranoto' then 'WK07'
    end as kode_wilker,
    'PAB'::text,
    count(*)
  from pab
  where extract(year from tanggal) = p_tahun
    and extract(month from tanggal) = p_bulan
    and wilayah_kerja in ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')
  group by wilayah_kerja;
$function$;

CREATE OR REPLACE FUNCTION status_lapor_mingguan(p_tahun integer, p_minggu integer)
 RETURNS TABLE(kode_wilker text, kegiatan text, jumlah bigint)
 LANGUAGE sql
 STABLE
AS $function$
  select a.kode_wilker, 'COP'::text, count(c.*)
  from wilker_nama_alias a
  join kegiatan_cop c on c.wilayah_kerja = a.wilayah_kerja_teks
  cross join lateral mmwr_week(c.tgl_kedatangan) w
  where w.tahun_epid = p_tahun and w.minggu_epid = p_minggu
    and a.kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06')
  group by a.kode_wilker

  union all

  select a.kode_wilker, 'PHQC'::text, count(p.*)
  from wilker_nama_alias a
  join kegiatan_phqc p on p.wilayah_kerja = a.wilayah_kerja_teks
  cross join lateral mmwr_week(p.tgl_keberangkatan) w
  where w.tahun_epid = p_tahun and w.minggu_epid = p_minggu
    and a.kode_wilker in ('WK01','WK02','WK03','WK04','WK05','WK06')
  group by a.kode_wilker

  union all

  select k.kode_wilker, 'Pesawat'::text, count(k.*)
  from kegiatan_pesawat k
  cross join lateral mmwr_week(k.tanggal) w
  where w.tahun_epid = p_tahun and w.minggu_epid = p_minggu
    and k.kode_wilker = 'WK07'
    and k.status_data = 'final'
  group by k.kode_wilker;
$function$;

CREATE OR REPLACE FUNCTION set_diubah_pada() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN NEW.diubah_pada = now(); RETURN NEW; END; $f$;

DROP TRIGGER IF EXISTS "trg_kegiatan_pesawat_updated_at" ON "kegiatan_pesawat";
CREATE TRIGGER "trg_kegiatan_pesawat_updated_at" BEFORE UPDATE ON "kegiatan_pesawat" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_lpn_updated_at" ON "laporan_penyakit_nasional";
CREATE TRIGGER "trg_lpn_updated_at" BEFORE UPDATE ON "laporan_penyakit_nasional" FOR EACH ROW EXECUTE FUNCTION set_updated_at_lpn();

DROP TRIGGER IF EXISTS "trg_hitung_anopheles" ON "vektor_anopheles";
CREATE TRIGGER "trg_hitung_anopheles" BEFORE INSERT ON "vektor_anopheles" FOR EACH ROW EXECUTE FUNCTION hitung_indikator_anopheles();

DROP TRIGGER IF EXISTS "trg_hitung_dbd" ON "vektor_dbd";
CREATE TRIGGER "trg_hitung_dbd" BEFORE INSERT ON "vektor_dbd" FOR EACH ROW EXECUTE FUNCTION hitung_indikator_dbd();

DROP TRIGGER IF EXISTS "trg_hitung_diare" ON "vektor_diare";
CREATE TRIGGER "trg_hitung_diare" BEFORE INSERT ON "vektor_diare" FOR EACH ROW EXECUTE FUNCTION hitung_indikator_diare();

DROP TRIGGER IF EXISTS "trg_hitung_tikus" ON "vektor_tikus";
CREATE TRIGGER "trg_hitung_tikus" BEFORE INSERT ON "vektor_tikus" FOR EACH ROW EXECUTE FUNCTION hitung_indikator_tikus();

DROP TRIGGER IF EXISTS trg_auth_kredensial_diubah ON auth_kredensial;
CREATE TRIGGER trg_auth_kredensial_diubah BEFORE UPDATE ON auth_kredensial FOR EACH ROW EXECUTE FUNCTION set_diubah_pada();
