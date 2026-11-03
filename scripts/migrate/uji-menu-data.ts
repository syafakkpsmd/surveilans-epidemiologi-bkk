// Uji menu (components/nav/menu-data.ts): label unik per grup untuk semua peran (TopNav memakai label sebagai key React),
// menu input hanya untuk yang berhak, dan penanda halaman aktif tepat satu.
//   npx tsx --test scripts/migrate/uji-menu-data.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cariHrefAktif, grupUntukPeran, hrefSamaDenganAktif } from '../../components/nav/menu-data';

const PERAN = ['admin', 'petugas', 'petugas_klinik', 'tamu', ''];
const labelData = (peran: string) => grupUntukPeran(peran).find((g) => g.title === 'Data')!.items.map((i) => i.label);

test('label item unik dalam setiap grup untuk semua peran (key React di TopNav)', () => {
  for (const peran of PERAN) {
    for (const g of grupUntukPeran(peran)) {
      const l = g.items.map((i) => i.label);
      assert.equal(new Set(l).size, l.length, `peran "${peran}", grup "${g.title}": label ganda ${l.filter((x, i) => l.indexOf(x) !== i)}`);
    }
  }
});

test('Input Data tepat satu untuk yang login; modul sertifikat hanya admin/petugas; tamu tidak melihatnya', () => {
  for (const peran of ['admin', 'petugas']) {
    const l = labelData(peran);
    assert.equal(l.filter((x) => x === 'Input Data').length, 1);
    for (const x of ['SSCEC', 'P3K Kapal', 'Sertifikat Air', 'Buku Kesehatan']) assert.ok(l.includes(x), `${peran}: ${x}`);
  }
  const klinik = labelData('petugas_klinik');
  assert.equal(klinik.filter((x) => x === 'Input Data').length, 1);
  assert.ok(!klinik.includes('SSCEC'));
  for (const peran of ['tamu', '']) {
    const l = labelData(peran);
    assert.ok(!l.includes('Input Data') && !l.includes('SSCEC'), `${peran || '(anonim)'} tidak boleh melihat menu input`);
  }
});

test('halaman modul menandai tepat satu item menu', () => {
  const g = grupUntukPeran('petugas');
  for (const [path, label] of [
    ['/dashboard/input-data/sertifikat/sscec', 'SSCEC'], ['/dashboard/input-data/sertifikat/air', 'Sertifikat Air'],
    ['/dashboard/input-data/sertifikat/buku_kesehatan', 'Buku Kesehatan'],
  ]) {
    const aktif = cariHrefAktif(path, g);
    const menyala = g.flatMap((x) => x.items).filter((i) => hrefSamaDenganAktif(i.href, aktif)).map((i) => i.label);
    assert.deepEqual(menyala, [label]);
  }
});
