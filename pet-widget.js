/*!
 * PixelPet v1.0.0 — 8bit 像素网页小挂件
 * 单文件 / 零依赖 / 可植入任意网站
 *
 * 用法一（一行引入）：
 *   <script src="pet-widget.js" data-pet data-size="160"></script>
 *
 * 用法二（编程控制）：
 *   <script src="pet-widget.js"></script>
 *   <script>PixelPet.create({ size: 160, position: 'bottom-right' });</script>
 *
 * 用法三（挂到某个容器里，不悬浮）：
 *   PixelPet.create({ size: 140, target: '#stage', drop: false });
 */
(function (window, document) {
  'use strict';
  if (window.PixelPet && window.PixelPet.__pp) return;

  /* ============================================================
   *  1. 像素绘制底层：80×68 逻辑网格，坐标沿用 160 基准 / 2
   * ============================================================ */
  const VW = 80, VH = 68;
  const GROUND = 66;            // 画布内地面（阴影中心）逻辑 y
  let g = null;                 // 当前渲染上下文

  const sn = v => Math.round(v / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const C = {
    ink: '#0e0e12', inkHi: '#45454e', jacket: '#1b1b21', cloth: '#2e2e37',
    clothHi: '#45454f', clothLo: '#141418',
    skin: '#ff9d55', skinHi: '#ffc184', skinSh: '#d9713a', white: '#ffffff', shoe: '#0e0e12',
    wood: '#b5762f', woodHi: '#e2a044', woodDk: '#7a4718',
    tea: '#f2fbff', teaBlue: '#2b7fc4', red: '#e0361c', gold: '#ffd12b'
  };

  function R0(x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function R(x, y, w, h, c) { R0(sn(x), sn(y), sn(w), sn(h), c); }

  /* 方形笔触粗线，端点使用 160 基准坐标 */
  function SQ(x1, y1, x2, y2, r, c) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(d / 2 + 1));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      R0(Math.round((x1 + (x2 - x1) * t) / 2) - r, Math.round((y1 + (y2 - y1) * t) / 2) - r, r * 2, r * 2, c);
    }
  }
  function GLY(rows, x, y, s, c) {
    const ox = sn(x), oy = sn(y);
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++)
        if (rows[j][i] === '#') R0(ox + i * s, oy + j * s, s, s, c);
  }

  const Z3 = ['###', '..#', '.#.', '#..', '###'];
  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  const STAR = ['..#..', '.###.', '#####', '.###.', '..#..'];

  /* ============================================================
   *  2. 角色：手绘点阵（1 字符 = 1 个 FC 像素）
   * ============================================================ */
  const PAL = { k: '#0d0d10', K: '#26262e', h: '#3f3f49', s: '#ff9d55', S: '#ffc184', d: '#d9713a', w: '#ffffff' };

  const HEAD = [
    "....kkk...kkkk...kkk....",
    "...kkkkk.kkkkk.kkkkk...",
    "..kkkkkkkkkkkkkkkkkkkk..",
    ".kkkkkkkkkkkkkkkkkkkkkk.",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    ".kkkkkkssssssssssskkkkkk",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    ".kkksssssssssssssssskkk.",
    "..kksssssssssssssssskk..",
    "..kksssssssssssssssskk..",
    "...kssssssssssssssssk...",
    ".........ksssssk........",
    ".........ksssssk........",
    "......kkkkkkkkkkkk......"
  ];

  /* 独立眉毛层：数值随姿态插值，外眉抬起、内眉下压，出拳时更凶。 */
  function drawBrows(x, y, p, side) {
    const relaxed = p.eye === 'happy' || p.eye === 'closed' || p.eye === 'sleep';
    const anger = relaxed ? 0 : clamp(p.brow || 0, 0, 1);
    const lift = relaxed ? 0 : Math.round(p.browLift || 0);
    const thickness = anger >= 0.55 ? 2 : 1;
    if (side) {
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const yy = 9 + (i >= 2 ? 1 : 0) - Math.round(anger * (1 - t)) + Math.round(anger * t) + lift;
        R0(x + 14 + i, y + yy, 1, thickness, C.ink);
      }
      return;
    }
    for (let eye = 0; eye < 2; eye++) {
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const xx = eye ? 18 - i : 5 + i;
        const yy = 8 + (i >= 3 ? 1 : 0) - Math.round(anger * (1 - t)) +
          Math.round(anger * t * 2) + (eye ? 0 : lift);
        R0(x + xx, y + yy, 1, thickness, C.ink);
      }
    }
  }

  function drawFaceOn(x0, y0, p) {
    const ey = y0 + 11;
    for (let s = 0; s < 2; s++) {
      const x = x0 + (s ? 13 : 6), inner = s ? -1 : 1;
      if (p.eye === 'happy') {
        R0(x, ey + 2, 5, 1, C.ink); R0(x + 1, ey + 1, 3, 1, C.ink);
        R0(x - 1, ey + 3, 1, 1, C.ink); R0(x + 5, ey + 3, 1, 1, C.ink);
      } else if (p.eye === 'closed' || p.eye === 'sleep') {
        R0(x, ey + 2, 5, 1, C.ink); R0(x + 1, ey + 1, 3, 1, C.ink);
        R0(x + 2, ey + 3, 1, 1, C.ink);
      } else if (p.eye === 'half') {
        R0(x, ey + 1, 5, 1, C.ink);
        R0(x, ey + 2, 5, 2, C.white);
        R0(x + (inner > 0 ? 2 : 1), ey + 2, 2, 2, C.ink);
      } else {
        R0(x, ey + 1, 5, 3, C.white);
        R0(x + 1, ey, 4, 1, C.white);
        R0(x + (inner > 0 ? 2 : 1), ey + 1, 2, 3, C.ink);
      }
    }
    drawBrows(x0, y0, p, false);
    R0(x0 + 11, y0 + 15, 2, 1, C.skinSh);
    const mx = x0 + 10, my = y0 + 17;
    switch (p.mouth) {
      case 'frown': R0(mx, my + 1, 4, 1, C.ink); R0(mx - 1, my, 1, 1, C.ink); R0(mx + 4, my, 1, 1, C.ink); break;
      case 'smile': R0(mx, my, 4, 1, C.ink); R0(mx - 1, my + 1, 1, 1, C.ink); R0(mx + 4, my + 1, 1, 1, C.ink); break;
      case 'yawn': R0(mx, my, 4, 3, C.ink); R0(mx + 1, my + 1, 2, 1, '#a8392a'); break;
      case 'o': R0(mx + 1, my, 2, 2, C.ink); break;
      default: R0(mx, my, 4, 1, C.ink);
    }
  }

  function drawHead(cx, cy, p) {
    const x0 = sn(cx) - 12, y0 = sn(cy) - 12;
    for (let j = 0; j < HEAD.length; j++) {
      const row = HEAD[j];
      for (let i = 0; i < row.length; i++) {
        const col = PAL[row[i]];
        if (col) R0(x0 + i, y0 + j, 1, 1, col);
      }
    }
    drawFaceOn(x0, y0, p);
  }

  /* ---------- 侧身：三视图中的方形蓬松短发、直面部与短颈 ---------- */
  /* 与正面使用同一 24×24 点阵；右向为原稿，左向由画布整体镜像。 */
  const SIDE_HEAD = [
    "....k...kkk..kkk...k....",
    "...kkk..kkkk.kkkk.kkkk..",
    "...kkkkkkkkkkkkkkkkkkk..",
    "..kkkkkkkkkkkkkkkkkkkkk.",
    ".kkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkksskkkkkk",
    "kkkkkkkkkkkkkssssssskkk.",
    ".kkkkkkkkkkksssssssssk..",
    ".kkkkkkkkkkksssssssssk..",
    ".kkkkkkkkkkksssssssssk..",
    ".kkkkkkkkkkksssssssssk..",
    ".kkkkkkkkkkksssssssssk..",
    ".kkkkkkksskksssssssssk..",
    ".kkkkkkksskksssssssssk..",
    ".kkkkkkksssksssssssssk..",
    ".kkkkkkksssssssssssssk..",
    ".kkkkkkksssssssskkkkkk..",
    ".kkkkkkksssssssssssk....",
    "..kkkkkssssssssssssk....",
    "....kkkksssssssssskk....",
    ".......kkkkkkkkkkk......",
    "..............ksk......."
  ];

  function drawSideHead(cx, cy, p) {
    const x = Math.round(cx) - 12, y = Math.round(cy) - 12;
    for (let j = 0; j < SIDE_HEAD.length; j++) {
      for (let i = 0; i < SIDE_HEAD[j].length; i++) {
        const col = PAL[SIDE_HEAD[j][i]];
        if (col) R0(x + i, y + j, 1, 1, col);
      }
    }

    /* 先画方眼，再叠眉毛，压眉时遮住一点上眼缘。 */
    const ex = x + 15, ey = y + 12;
    if (p.eye === 'happy') {
      R0(ex, ey + 2, 4, 1, C.ink); R0(ex + 1, ey + 1, 2, 1, C.ink);
    } else if (p.eye === 'closed' || p.eye === 'sleep') {
      R0(ex, ey + 2, 4, 1, C.ink);
    } else if (p.eye === 'half') {
      R0(ex, ey + 1, 4, 3, C.white);
      R0(ex + 2, ey + 1, 2, 3, C.ink);
    } else {
      R0(ex + 1, ey - 1, 3, 1, C.white);
      R0(ex, ey, 5, 4, C.white);
      R0(ex + 2, ey, 2, 4, C.ink);
    }

    drawBrows(x, y, p, true);

    /* 嘴只在脸的前缘留一条短横线，避免形成胡须状的下颌描边。 */
    const mx = x + 18, my = y + 18;
    if (p.mouth === 'o' || p.mouth === 'yawn') {
      R0(mx, my - 1, 2, p.mouth === 'yawn' ? 3 : 2, C.ink);
    } else {
      R0(mx - (p.mouth === 'smile' ? 1 : 0), my, 3, 1, C.ink);
      if (p.mouth === 'smile') R0(mx + 2, my - 1, 1, 1, C.ink);
      if (p.mouth === 'frown') R0(mx - 1, my + 1, 1, 1, C.ink);
    }
  }

  /* 逻辑坐标的方形笔触粗线 */
  function SL(x1, y1, x2, y2, r, c) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(d * 1.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      R0(Math.round(x1 + (x2 - x1) * t) - r, Math.round(y1 + (y2 - y1) * t) - r, r * 2, r * 2, c);
    }
  }

  function drawSideTorso(ox, oy) {
    const cx = 40 + ox, top = 36 + oy;
    /* 窄侧身：背部近乎竖直，前襟保留参考图里的白色竖边。 */
    R0(cx - 5, top - 1, 10, 2, C.ink);
    R0(cx - 6, top + 1, 12, 2, C.ink);
    R0(cx - 7, top + 3, 14, 13, C.ink);
    R0(cx - 6, top + 3, 12, 12, C.jacket);
    R0(cx - 5, top + 2, 7, 2, C.cloth);
    R0(cx - 6, top + 5, 2, 10, C.clothLo);
    R0(cx + 2, top + 3, 2, 12, C.cloth);
    R0(cx + 5, top + 3, 1, 1, C.white);
    R0(cx + 4, top + 4, 1, 10, C.white);
    R0(cx + 5, top + 7, 1, 1, C.white);
    R0(cx + 5, top + 13, 1, 1, C.white);
    R0(cx - 6, top + 15, 12, 2, C.ink);
  }

  function drawSideArm(a, ox, oy, far) {
    const sx = a[0] + ox, sy = a[1] + oy, ex = a[2] + ox, ey = a[3] + oy,
      hx = a[4] + ox, hy = a[5] + oy;
    const col = far ? '#20202a' : '#2b2b32';
    SL(sx, sy, ex, ey, 2.6, C.ink); SL(ex, ey, hx, hy, 2.6, C.ink);
    SL(sx, sy, ex, ey, 1.7, col); SL(ex, ey, hx, hy, 1.7, col);
    if (!far) R0(Math.round((sx + ex) / 2) - 1, Math.round((sy + ey) / 2) - 2, 2, 3, C.cloth);
    const hx0 = Math.round(hx), hy0 = Math.round(hy);
    /* 白袖口 + 拳头 */
    R0(hx0 - 3, hy0 - 2, 6, 4, C.ink);
    R0(hx0 - 2, hy0 - 1, 4, 2, C.white);
    R0(hx0 - 2, hy0 - 1, 5, 5, C.ink);
    R0(hx0 - 2, hy0, 5, 4, far ? C.skinSh : C.skin);
  }

  function drawSideLeg(l, ox, oy, far) {
    const hx = l[0] + ox, hy = l[1] + oy, kx = l[2] + ox, ky = l[3] + oy,
      ax = l[4] + ox, ay = l[5] + oy;
    const col = far ? '#24242c' : C.cloth;
    /* 宽裤腿、方鞋头；避免细腿配小鞋偏离三视图的厚重轮廓。 */
    SL(hx, hy, kx, ky, 4, C.ink); SL(kx, ky, ax, ay, 4, C.ink);
    SL(hx, hy, kx, ky, 3, col); SL(kx, ky, ax, ay, 3, col);
    const fx = Math.round(ax), fy = Math.round(ay);
    if (l[6] > 0.5) {
      R0(fx - 3, fy - 2, 10, 7, C.ink);
      R0(fx - 2, fy - 1, 8, 4, C.shoe);
      R0(fx - 2, fy + 3, 8, 1, C.white);
    } else {
      R0(fx - 4, fy - 2, 12, 2, C.ink);
      R0(fx - 4, fy, 14, 5, C.ink);
      R0(fx - 3, fy, 12, 3, C.shoe);
      R0(fx - 3, fy + 3, 12, 1, C.white);
    }
  }

  function drawPetSide(p) {
    const ox = p.ox / 2, oy = p.oy / 2;
    drawSideArm(p.armF, ox, oy, true);
    drawSideLeg(p.legs[1], ox, oy, true);
    drawSideTorso(ox, oy);
    drawSideLeg(p.legs[0], ox, oy, false);
    drawSideHead(40 + ox + p.hx / 2, 24 + oy + p.hy / 2, p);
    drawSideArm(p.armN, ox, oy, false);
  }

  function drawTorso(ox, oy) {
    const cx = 80 + ox;
    const rows = [[70, 17], [72, 19], [74, 21], [76, 22], [78, 22], [80, 22], [82, 21], [84, 21], [86, 20],
      [88, 20], [90, 20], [92, 20], [94, 20], [96, 21], [98, 21], [100, 21], [102, 21], [104, 21]];
    for (let i = 0; i < rows.length; i++) {
      const y = rows[i][0], w = rows[i][1];
      R(cx - w, y + oy, w * 2, 2, C.ink);
      R(cx - w + 2, y + oy, w * 2 - 4, 2, C.jacket);
    }
    /* 白立领 */
    R(cx - 6, 70 + oy, 12, 2, C.white);
    R(cx - 1, 71 + oy, 2, 1, C.ink);
    /* 门襟滚边 */
    for (let i = 0; i < 3; i++) R(cx + 5 - i * 2, 74 + i * 2 + oy, 2, 2, C.white);
    R(cx - 1, 80 + oy, 2, 18, C.white);
    /* 单层布褶 */
    R(cx - 13, 80 + oy, 2, 10, C.clothHi); R(cx + 10, 86 + oy, 2, 8, C.clothHi);
    R(cx - 16, 104 + oy, 32, 2, C.ink);
    /* 白盘扣 */
    R(cx + 2, 86 + oy, 3, 2, C.white); R(cx + 2, 95 + oy, 3, 2, C.white);
  }

  function drawLegs(legs, ox, oy) {
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      const hpX = l[0] + ox, hpY = l[1] + oy, knX = l[2] + ox, knY = l[3] + oy,
        anX = l[4] + ox, anY = l[5] + oy, ftX = l[6] + ox, ftY = l[7] + oy;
      SQ(hpX, hpY, knX, knY, 5, C.ink); SQ(knX, knY, anX, anY, 4, C.ink);
      SQ(hpX, hpY, knX, knY, 4, C.cloth); SQ(knX, knY, anX, anY, 3, C.cloth);
      const fx = sn(ftX), fy = sn(ftY);
      R0(fx - 4, fy - 8, 8, 5, C.ink); R0(fx - 3, fy - 7, 6, 4, C.cloth);
      R0(fx - 6, fy - 3, 13, 8, C.ink);
      R0(fx - 5, fy - 3, 11, 5, C.shoe);
      R0(fx - 4, fy - 3, 3, 1, C.clothHi);
      R0(fx - 5, fy + 2, 11, 2, C.white);
      R0(fx - 5, fy + 4, 11, 1, C.ink);
    }
  }

  function drawHand(x, y, type) {
    const px = sn(x), py = sn(y);
    if (type === 'palm') {
      for (let i = 0; i < 3; i++) R0(px + (i - 1) * 3, py - 8, 2, 6, C.skin);
      R0(px - 4, py - 4, 9, 9, C.ink); R0(px - 3, py - 3, 7, 7, C.skin);
      R0(px - 3, py + 2, 7, 1, C.skinSh);
    } else if (type === 'cup') {
      R0(px - 3, py - 3, 6, 6, C.ink); R0(px - 2, py - 2, 4, 4, C.skin);
    } else {
      R0(px - 3, py - 4, 7, 7, C.ink); R0(px - 2, py - 3, 5, 5, C.skin);
      R0(px - 2, py - 2, 5, 1, C.skinSh);
      R0(px - 2, py + 1, 5, 1, C.skinSh);
      R0(px - 2, py - 3, 1, 5, C.skinSh);
    }
  }

  function drawArm(a, ox, oy, back) {
    const sx1 = a[0] + ox, sy1 = a[1] + oy, ex1 = a[2] + ox, ey1 = a[3] + oy, hx1 = a[4] + ox, hy1 = a[5] + oy;
    const hand = a[6], col = back ? C.clothLo : C.cloth;
    SQ(sx1, sy1, ex1, ey1, 4, C.ink); SQ(ex1, ey1, hx1, hy1, 4, C.ink);
    SQ(sx1, sy1, ex1, ey1, 3, col); SQ(ex1, ey1, hx1, hy1, 3, col);
    if (!back) {
      R0(sn((sx1 + ex1) / 2) - 2, sn((sy1 + ey1) / 2) - 3, 4, 2, C.clothHi);
      R0(sn((ex1 + hx1) / 2) - 2, sn((ey1 + hy1) / 2) - 3, 4, 2, C.clothHi);
    }
    if (hand === 'hide') return;
    const wx = sn(ex1 + (hx1 - ex1) * 0.45), wy = sn(ey1 + (hy1 - ey1) * 0.45);
    R0(wx - 4, wy - 1, 9, 4, C.ink);
    R0(wx - 3, wy, 7, 2, C.white);
    drawHand(hx1, hy1, hand);
  }

  function drawPet(p) {
    const ox = p.ox, oy = p.oy, HX = 80 + ox + p.hx, HY = 48 + oy + p.hy;
    drawLegs(p.legs, ox, p.ly || 0);
    if (p.armL[6] === 'hide') drawArm(p.armL, ox, oy, true);
    if (p.armR[6] === 'hide') drawArm(p.armR, ox, oy, true);
    drawTorso(ox, oy);
    drawHead(HX, HY, p);
    if (p.armL[6] !== 'hide') drawArm(p.armL, ox, oy, false);
    if (p.armR[6] !== 'hide') drawArm(p.armR, ox, oy, false);
    if (p.prop === 'tea') {
      const a = p.armR, x = sn(a[4] + ox), y = sn(a[5] + oy);
      R0(x - 3, y - 5, 7, 7, C.ink);
      R0(x - 2, y - 4, 5, 5, C.tea);
      R0(x - 2, y - 4, 5, 1, C.white);
      R0(x - 2, y - 1, 5, 1, C.teaBlue);
      R0(x + 4, y - 3, 2, 3, C.teaBlue);
    }
  }

  function drawDummy(ox, oy) {
    R(6 + ox, 128 + oy, 42, 6, C.woodDk); R(4 + ox, 134 + oy, 46, 3, C.wood);
    R(16 + ox, 58 + oy, 14, 70, C.wood); R(18 + ox, 58 + oy, 3, 70, C.woodHi); R(27 + ox, 58 + oy, 2, 70, C.woodDk);
    R(14 + ox, 54 + oy, 18, 5, C.woodHi); R(16 + ox, 56 + oy, 14, 2, '#c08a52');
    R(28 + ox, 78 + oy, 15, 5, C.woodHi); R(40 + ox, 78 + oy, 3, 3, C.woodDk);
    R(28 + ox, 94 + oy, 13, 5, C.woodHi); R(38 + ox, 94 + oy, 3, 3, C.woodDk);
    R(28 + ox, 110 + oy, 17, 4, C.woodHi);
    R(20 + ox, 64 + oy, 1, 62, '#8a5b31'); R(24 + ox, 70 + oy, 1, 54, '#8a5b31');
  }

  /* 茶座：矮几 + 茶壶 + 一只空杯，只在喝茶动作里出现 */
  function drawTeaStand(ox) {
    const x = 106 + ox;
    /* 落地影子 */
    g.globalAlpha = 0.13;
    R(x + 3, 133, 34, 3, '#000000');
    g.globalAlpha = 1;
    /* 桌面 */
    R(x, 118, 38, 4, C.woodHi);
    R(x, 118, 38, 1, '#f2c274');
    R(x, 122, 38, 2, C.woodDk);
    /* 四条腿（前后两对，像素图上画两对就够） */
    R(x + 5, 124, 4, 10, C.wood);
    R(x + 29, 124, 4, 10, C.wood);
    R(x + 9, 130, 20, 2, C.woodDk);
    /* 茶壶：粗黑描边 + 平涂青瓷 */
    R(x + 10, 107, 17, 12, C.ink);
    R(x + 11, 108, 15, 10, C.teaBlue);
    R(x + 12, 109, 5, 3, '#7fc0e8');
    R(x + 12, 115, 13, 2, '#1d6aa8');
    R(x + 12, 103, 12, 4, C.ink);
    R(x + 13, 104, 10, 2, C.teaBlue);
    R(x + 16, 100, 4, 3, C.teaBlue);
    /* 壶嘴 + 提梁 */
    R(x + 26, 110, 5, 3, C.ink);
    R(x + 26, 110, 4, 2, C.teaBlue);
    R(x + 7, 110, 4, 6, C.ink);
    R(x + 8, 111, 2, 4, C.teaBlue);
    /* 空杯 */
    R(x + 30, 113, 7, 6, C.ink);
    R(x + 31, 114, 5, 4, C.tea);
    R(x + 31, 116, 5, 1, C.teaBlue);
  }

  function drawShadow(ox, lift) {
    const k = clamp(lift, 0, 3);
    const w = 48 * (1 - k * 0.2);
    g.globalAlpha = Math.max(0.06, 0.2 - k * 0.045);
    R(80 + ox - w / 2, 131, w, 3, '#000000');
    R(80 + ox - w / 3, 129, w * 0.66, 3, '#000000');
    g.globalAlpha = 1;
  }

  function drawFx(p, now) {
    const t = Math.floor(now / 90), f = p.fx, left = (p.prop === 'dummy');
    if (f === 'speed' || f === 'impact') {
      const xs = left ? 4 : 108;
      if (f === 'speed') {
        for (let i = 0; i < 4; i++) {
          const y = 72 + i * 7 + ((t + i) % 2);
          R(xs + (i % 2) * 4, y, 28 - (i % 3) * 8, 1, '#a9a294');
          R(xs + 6 + (i % 2) * 4, y + 2, 18, 1, '#c4bcab');
        }
      } else {
        const cx = left ? 46 : 132, cy = 76;
        R(cx - 1, cy - 9, 3, 19, '#ffffff'); R(cx - 9, cy - 1, 19, 3, '#ffffff');
        R(cx - 1, cy - 5, 3, 11, C.gold); R(cx - 5, cy - 1, 11, 3, C.gold);
        for (let i = 0; i < 4; i++) R(xs + ((t + i * 7) % 34), 62 + i * 9, 2, 2, C.gold);
      }
    }
    if (f === 'steam') {
      for (let i = 0; i < 3; i++) {
        const y = 54 - i * 6 - (t % 3), x = 82 + Math.sin(now / 260 + i) * 3 + i;
        R(x, y, 1, 2, '#ffffff'); R(x + 2, y - 2, 1, 2, '#e6eef0'); R(x + 1, y - 4, 1, 1, '#ffffff');
      }
    }
    if (f === 'zzz') {
      for (let i = 0; i < 3; i++) {
        const x = 86 + i * 8 + Math.sin(now / 500 + i) * 2, y = 40 - i * 12 - (t % 5);
        GLY(Z3, x, y, i === 2 ? 2 : 1, i === 2 ? '#514d61' : '#736f83');
      }
    }
    if (f === 'heart') {
      GLY(HEART, 102 + Math.sin(now / 300) * 2, 34 - (t % 6), 2, C.red);
      GLY(HEART, 120 + Math.sin(now / 240) * 2, 50 - ((t + 2) % 5), 1, '#d97a68');
      GLY(STAR, 60 - (t % 3), 36, 1, C.gold);
    }
    if (f === 'dots') {
      for (let i = 0; i < 3; i++) R(104 + i * 5, 44 - ((t + i) % 3) * 2, 2, 2, '#9c9280');
    }
  }

  /* ============================================================
   *  3. 姿态预设与动作序列
   * ============================================================ */
  const A = {
    downL: [66, 76, 59, 92, 60, 105, 'fist'], downR: [94, 76, 101, 92, 100, 105, 'fist'],
    behindL: [66, 76, 58, 90, 64, 100, 'hide'], behindR: [94, 76, 102, 90, 96, 100, 'hide'],
    waistL: [66, 76, 60, 88, 72, 92, 'fist'], waistR: [94, 76, 100, 88, 88, 92, 'fist'],
    guardL: [66, 76, 58, 84, 64, 74, 'palm'], guardR: [94, 76, 102, 84, 96, 74, 'palm'],
    palmR: [94, 76, 110, 78, 130, 72, 'palm'], palmL: [66, 76, 50, 78, 30, 72, 'palm'],
    punchR: [94, 76, 112, 80, 134, 76, 'fist'],
    hitL: [66, 76, 48, 82, 38, 78, 'fist'], hitPalmL: [66, 76, 50, 80, 42, 76, 'palm'],
    cupR: [94, 78, 104, 88, 88, 68, 'cup'], cupLowR: [94, 78, 102, 94, 88, 84, 'cup'],
    yawnL: [66, 76, 58, 78, 72, 60, 'fist'],
    upL: [66, 76, 54, 62, 52, 56, 'fist'], upR: [94, 76, 106, 62, 108, 56, 'fist'],
    swL1: [66, 76, 58, 92, 62, 104, 'fist'], swL2: [66, 76, 60, 90, 70, 102, 'fist'],
    swR1: [94, 76, 102, 90, 90, 102, 'fist'], swR2: [94, 76, 100, 92, 98, 104, 'fist'],
    /* 参考图起手式：左手立掌护胸，右手握拳收腰 */
    guardPalmL: [66, 78, 58, 94, 60, 84, 'palm'], hipFistR: [94, 78, 103, 94, 96, 100, 'fist'],
    guardPalmR: [94, 78, 102, 94, 100, 84, 'palm'], hipFistL: [66, 78, 57, 94, 64, 100, 'fist'],
    /* 喝茶时没端杯子的那只手：搭在大腿上，不再立掌 */
    lapL: [66, 78, 61, 93, 69, 107, 'fist'],
    /* 叶问蹲：双拳压在膝盖上（坐标是 oy=0 基准，蹲下时 oy 自动整体下移） */
    sqKneeL: [66, 76, 57, 92, 54, 98, 'fist'], sqKneeR: [94, 76, 100, 92, 104, 104, 'fist'],
    /* 侧身走路的手臂（逻辑坐标，前 6 位：肩、肘、手） */
    wFwdN: [37, 39, 40, 45, 43, 49], wBackN: [37, 39, 34, 45, 33, 50], wMidN: [37, 39, 36, 45, 37, 51],
    wFwdF: [42, 39, 44, 45, 46, 49], wBackF: [42, 39, 39, 45, 37, 50], wMidF: [42, 39, 42, 45, 42, 51],
    tuckN: [40, 38, 47, 44, 44, 52], tuckF: [40, 38, 46, 45, 43, 52],
    hugN: [40, 38, 46, 46, 43, 52], hugF: [40, 38, 45, 47, 42, 53]
  };

  /* 侧身腿型：[髋 x,y, 膝 x,y, 踝 x,y, 后脚跟抬起] */
  const LS = {
    contactA: [[40, 50, 47, 55, 48, 62, 0], [40, 50, 33, 55, 32, 61, 1]],
    passA: [[40, 50, 43, 56, 44, 62, 0], [40, 50, 37, 56, 36, 61, 1]],
    contactB: [[40, 50, 33, 55, 32, 61, 1], [40, 50, 47, 55, 48, 62, 0]],
    passB: [[40, 50, 37, 56, 36, 61, 1], [40, 50, 43, 56, 44, 62, 0]],
    tuck: [[40, 50, 49, 55, 42, 59, 0], [40, 50, 48, 56, 41, 60, 1]]
  };

  const L = {
    stand: [[72, 98, 71, 112, 72, 122, 74, 126], [88, 98, 89, 112, 88, 122, 86, 126]],
    stance: [[70, 96, 63, 111, 60, 123, 61, 126], [90, 96, 97, 111, 100, 123, 99, 126]],
    horse: [[72, 98, 58, 113, 52, 124, 48, 127], [88, 98, 102, 113, 108, 124, 112, 127]],
    sit: [[72, 98, 62, 113, 64, 124, 67, 127], [88, 98, 98, 113, 100, 124, 103, 127]],
    kick: [[72, 98, 70, 114, 70, 124, 72, 127], [88, 98, 106, 90, 120, 80, 124, 76]],
    kickHigh: [[72, 98, 70, 114, 70, 124, 72, 127], [88, 98, 110, 82, 128, 68, 132, 64]],
    walkA: [[72, 98, 66, 114, 64, 124, 62, 127], [88, 98, 94, 114, 96, 124, 98, 127]],
    walkB: [[72, 98, 78, 114, 80, 124, 82, 127], [88, 98, 84, 114, 82, 124, 80, 127]],
    crouch: [[68, 98, 56, 106, 58, 118, 60, 126], [92, 98, 104, 106, 102, 118, 100, 126]],
    landBent: [[70, 98, 62, 109, 64, 121, 66, 126], [90, 98, 98, 109, 96, 121, 94, 126]],
    /* 叶问蹲：左腿深蹲支撑（膝上提、脚掌着地），右腿向前伸出悬空（脚尖绷起） */
    squat: [[72, 112, 55, 106, 57, 122, 57, 126], [88, 112, 107, 113, 121, 116, 128, 117]]
  };

  function P(o) {
    return Object.assign({
      ox: 0, oy: 0, ly: 0, hx: 0, hy: 0, eye: 'stern', mouth: 'flat', side: 0, brow: 0, browLift: 0,
      armL: A.guardPalmL, armR: A.hipFistR, legs: L.stance,
      armN: A.wMidN, armF: A.wMidF, prop: 'none', fx: 'none'
    }, o || {});
  }

  const F = (p, tw, hold, extra) => Object.assign({ p: p, tw: tw, hold: hold }, extra || {});

  const ANIM = {
    idle: {
      label: '待机', loop: true, frames: [
        /* 晃头时先挑一边眉，再双眉下压，带一点不服气的挑衅。 */
        F(P({ hx: 0, brow: 0.35 }), 150, 120, { say: '……' }),
        F(P({ hx: 3.5, hy: 1, brow: 0.55, browLift: -1 }), 90, 50),
        F(P({ hx: 6.5, brow: 0.9 }), 80, 120),
        F(P({ hx: 3.5, hy: 1, brow: 0.65 }), 80, 50),
        F(P({ hx: 0, brow: 0.35 }), 100, 80),
        F(P({ hx: 0, eye: 'closed' }), 40, 70),
        F(P({ hx: -3.5, hy: 1, brow: 0.55, browLift: -1 }), 90, 50),
        F(P({ hx: -6.5, brow: 0.9 }), 80, 120),
        F(P({ hx: -3.5, hy: 1, brow: 0.65 }), 80, 50)
      ]
    },
    bored: {
      label: '无聊', loop: true, frames: [
        F(P({ hx: 2, hy: 2, eye: 'half', mouth: 'frown', fx: 'dots' }), 420, 1200, { say: '好无聊……' }),
        F(P({ hx: -3, hy: 2, eye: 'half', mouth: 'frown' }), 500, 1000),
        F(P({ hy: 3, eye: 'closed', mouth: 'yawn', armL: A.yawnL, armR: A.downR, fx: 'dots' }), 320, 900, { say: '哈——欠……' }),
        F(P({ oy: 6, legs: L.horse, armL: A.waistL, armR: A.waistR, eye: 'half', mouth: 'frown' }), 520, 1100, { say: '没人陪练吗？' }),
        F(P({ hx: 2, hy: 2, eye: 'half', mouth: 'frown', fx: 'dots' }), 520, 1200, { say: '……' })
      ]
    },
    tea: {
      label: '喝茶', loop: false, frames: [
        F(P({ prop: 'tea', oy: 8, legs: L.sit, armL: A.lapL, armR: A.cupLowR }), 480, 700, { say: '先歇一口气。', sfx: 'tea' }),
        F(P({ prop: 'tea', oy: 8, legs: L.sit, armL: A.lapL, armR: A.cupR, eye: 'closed', mouth: 'o', fx: 'steam' }), 460, 820, { say: '嗯，好茶。' }),
        F(P({ prop: 'tea', oy: 8, legs: L.sit, armL: A.lapL, armR: A.cupR, eye: 'closed', mouth: 'smile', hy: -1, fx: 'steam' }), 320, 700),
        F(P({ prop: 'tea', oy: 8, legs: L.sit, armL: A.lapL, armR: A.cupLowR, eye: 'stern', mouth: 'flat' }), 460, 620, { say: '再练一轮。' }),
        F(P({ prop: 'tea', oy: 0, legs: L.stand, armL: A.downL, armR: A.downR }), 500, 420)
      ]
    },
    punch: {
      label: '练拳', loop: false, frames: [
        F(P({ brow: 0.65, oy: 6, legs: L.horse, armL: A.waistL, armR: A.guardR }), 240, 260, { say: '我要打十个！' }),
        F(P({ brow: 1, oy: 6, legs: L.horse, armL: A.waistL, armR: A.punchR, fx: 'speed' }), 130, 230, { sfx: 'hit', say: '哈！' }),
        F(P({ brow: 0.8, oy: 6, legs: L.horse, armL: A.guardL, armR: A.waistR, fx: 'impact' }), 150, 240, { sfx: 'hit' }),
        F(P({ brow: 1, oy: 6, legs: L.horse, armL: A.waistL, armR: A.palmR, fx: 'speed' }), 150, 250, { sfx: 'hit', say: '寸劲！' }),
        F(P({ brow: 0.5, oy: 6, legs: L.horse, armL: A.waistL, armR: A.guardR }), 260, 380)
      ]
    },
    dummy: {
      label: '木人桩', loop: false, frames: [
        F(P({ brow: 0.65, prop: 'dummy', ox: -4, oy: 6, legs: L.horse, armL: A.guardL, armR: A.waistR, hx: -3 }), 260, 300, { say: '木人桩，接招。' }),
        F(P({ brow: 1, prop: 'dummy', ox: -4, oy: 6, legs: L.horse, armL: A.hitL, armR: A.waistR, hx: -4, fx: 'impact' }), 130, 200, { sfx: 'hit' }),
        F(P({ brow: 0.75, prop: 'dummy', ox: -4, oy: 6, legs: L.horse, armL: A.guardL, armR: A.waistR, hx: -3 }), 160, 180),
        F(P({ brow: 1, prop: 'dummy', ox: -4, oy: 6, legs: L.horse, armL: A.hitPalmL, armR: A.waistR, hx: -4, fx: 'speed' }), 130, 220, { sfx: 'hit', say: '一、二！' }),
        F(P({ brow: 0.55, prop: 'dummy', ox: -4, oy: 6, legs: L.horse, armL: A.guardL, armR: A.waistR, hx: -3 }), 260, 320)
      ]
    },
    kick: {
      label: '高踢腿', loop: false, frames: [
        F(P({ brow: 0.65, ox: 2, legs: L.kick, armL: A.waistL, armR: A.guardR, hx: 2 }), 300, 360, { say: '喝——！' }),
        F(P({ brow: 1, ox: 4, oy: -2, legs: L.kickHigh, armL: A.waistL, armR: A.guardR, hx: 3, fx: 'speed' }), 220, 460, { sfx: 'hit' }),
        F(P({ brow: 0.35, legs: L.stand }), 420, 380)
      ]
    },
    /* 叶问蹲：单腿深蹲 + 前腿伸直，正脸挑衅 */
    squat: {
      label: '叶问蹲', loop: false, frames: [
        F(P({ brow: 0.65, oy: 4, legs: L.crouch, armL: A.waistL, armR: A.waistR }), 200, 200, { say: '我要打十个！' }),
        F(P({ brow: 1, oy: 8, legs: L.squat, armL: A.sqKneeL, armR: A.sqKneeR, hx: 2, hy: 2, eye: 'stern' }), 240, 560, { sfx: 'land' }),
        F(P({ brow: 0.8, oy: 8, legs: L.squat, armL: A.sqKneeL, armR: A.sqKneeR, hx: -2, hy: 2, eye: 'stern' }), 220, 620),
        F(P({ brow: 1, oy: 8, legs: L.squat, armL: A.sqKneeL, armR: A.sqKneeR, hx: 2, hy: 2, eye: 'stern', mouth: 'smile' }), 220, 520),
        F(P({ brow: 0.35, oy: 0, legs: L.stand }), 320, 340)
      ]
    },
    happy: {
      label: '开心', loop: false, frames: [
        F(P({ oy: -5, ly: -5, eye: 'happy', mouth: 'smile', armL: A.upL, armR: A.upR, fx: 'heart' }), 150, 380, { say: '嘿嘿！', sfx: 'happy' }),
        F(P({ oy: 0, eye: 'happy', mouth: 'smile', armL: A.behindL, armR: A.behindR, fx: 'heart' }), 220, 620),
        F(P({ eye: 'happy', mouth: 'flat' }), 360, 560)
      ]
    },
    sleep: {
      label: '睡着了', loop: true, frames: [
        F(P({ eye: 'sleep', mouth: 'o', hy: 3, oy: 2, fx: 'zzz' }), 620, 1400, { say: 'Zzz……' }),
        F(P({ eye: 'sleep', mouth: 'o', hy: 4, oy: 3, fx: 'zzz' }), 620, 1400),
        F(P({ eye: 'sleep', mouth: 'flat', hy: 3, oy: 2, fx: 'zzz' }), 620, 1400)
      ]
    },
    behind: {
      label: '背手', loop: true, frames: [
        F(P({ armL: A.behindL, armR: A.behindR }), 420, 1300, { say: '……' }),
        F(P({ armL: A.behindL, armR: A.behindR, eye: 'closed' }), 90, 130),
        F(P({ armL: A.behindL, armR: A.behindR, hy: 1, hx: 2 }), 520, 1000, { say: '静。' })
      ]
    },
    walk: {
      label: '散步', loop: true, frames: [
        F(P({ side: 1, legs: LS.contactA, armN: A.wBackN, armF: A.wFwdF }), 120, 16),
        F(P({ side: 1, legs: LS.passA, armN: A.wMidN, armF: A.wMidF, oy: -2 }), 120, 16),
        F(P({ side: 1, legs: LS.contactB, armN: A.wFwdN, armF: A.wBackF }), 120, 16),
        F(P({ side: 1, legs: LS.passB, armN: A.wMidN, armF: A.wMidF, oy: -2 }), 120, 16)
      ]
    },
    /* 空中翻跟头 */
    tumble: {
      label: '空翻', loop: true, frames: [
        F(P({ side: 1, legs: LS.tuck, armN: A.hugN, armF: A.hugF, mouth: 'o' }), 200, 60)
      ]
    },
    /* 落地站稳 */
    land: {
      label: '落地', loop: false, frames: [
        F(P({ oy: 7, legs: L.crouch, armL: A.downL, armR: A.downR, eye: 'closed' }), 90, 90),
        F(P({ oy: 3, legs: L.landBent, armL: A.waistL, armR: A.waistR }), 140, 220),
        F(P({ oy: 0 }), 160, 260)
      ]
    },
    /* 被拎起 / 下落 */
    drag: {
      label: '被拎起', loop: true, frames: [
        F(P({ armL: A.upL, armR: A.upR, mouth: 'o', hx: -1 }), 220, 140),
        F(P({ armL: A.upL, armR: A.upR, mouth: 'o', hx: 1, oy: 1 }), 220, 140)
      ]
    },
    fall: {
      label: '下落', loop: true, frames: [
        F(P({ armL: A.upL, armR: A.upR, mouth: 'o', legs: L.stand }), 180, 80)
      ]
    }
  };

  const ACTION_POOL = ['punch', 'tea', 'kick', 'happy', 'squat'];

  /* ============================================================
   *  4. 工具
   * ============================================================ */
  function lerp(a, b, t) {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i], t));
    return b;
  }
  function lerpPose(a, b, t) {
    const o = {};
    for (const k in b) o[k] = (k in a) ? lerp(a[k], b[k], t) : b[k];
    return o;
  }

  let AC = null;
  function beep(kind, on) {
    if (!on) return;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      const cfg = { hit: [170, 0.09, 'square'], tea: [540, 0.2, 'sine'], happy: [680, 0.14, 'square'], land: [220, 0.07, 'triangle'] }[kind] || [320, 0.09, 'square'];
      const o = AC.createOscillator(), gn = AC.createGain(), n = AC.currentTime;
      o.type = cfg[2];
      o.frequency.setValueAtTime(cfg[0], n);
      if (kind === 'happy') o.frequency.exponentialRampToValueAtTime(1150, n + cfg[1]);
      if (kind === 'land') o.frequency.exponentialRampToValueAtTime(90, n + cfg[1]);
      gn.gain.setValueAtTime(0.05, n);
      gn.gain.exponentialRampToValueAtTime(0.0001, n + cfg[1]);
      o.connect(gn); gn.connect(AC.destination);
      o.start(n); o.stop(n + cfg[1]);
    } catch (e) { /* 静默失败 */ }
  }

  /* ============================================================
   *  5. 样式（Shadow DOM 内，不污染宿主页面）
   * ============================================================ */
  const CSS = `
  :host{all:initial}
  .pp-pet{position:absolute;left:0;top:0;cursor:grab;touch-action:none;transform-origin:50% 83%;will-change:transform;
    pointer-events:auto;}
  .pp-pet.grabbing{cursor:grabbing}
  .pp-pet canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;}
  .pp-bubble{position:absolute;left:0;top:0;width:max-content;max-width:220px;padding:6px 9px;background:#fff9e8;border:2px solid #14141a;color:#241c12;
    font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace;
    box-shadow:3px 3px 0 rgba(20,20,26,.26);opacity:0;visibility:hidden;
    transform:translate(-50%,-100%) scale(.9);transform-origin:50% 100%;
    transition:opacity .16s ease,transform .16s ease,visibility .16s;pointer-events:none;z-index:3}
  .pp-bubble.on{opacity:1;visibility:visible;transform:translate(-50%,-100%) scale(1)}
  .pp-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;width:8px;height:8px;margin-left:-4px;background:#fff9e8;
    border-right:2px solid #14141a;border-bottom:2px solid #14141a;transform:rotate(45deg)}
  .pp-bubble.below{transform:translate(-50%,0) scale(.9);transform-origin:50% 0}
  .pp-bubble.below.on{transform:translate(-50%,0) scale(1)}
  .pp-bubble.below::after{top:-6px;bottom:auto;border:0;border-left:2px solid #14141a;border-top:2px solid #14141a}
  .pp-bar{position:absolute;left:0;top:0;display:grid;grid-template-columns:repeat(2,26px);gap:3px;padding:3px;
    background:#fff9e8;border:2px solid #14141a;box-shadow:3px 3px 0 rgba(20,20,26,.26);
    opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .14s,transform .14s,visibility .14s;pointer-events:auto;z-index:4}
  .pp-bar.on{opacity:1;visibility:visible;transform:none}
  .pp-bar button{width:26px;height:26px;display:grid;place-items:center;padding:0;background:#f2e7cd;border:2px solid #14141a;
    color:#241c12;font:12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer;-webkit-appearance:none;appearance:none}
  .pp-bar button:hover{background:#ffd76a}
  .pp-bar button:active{transform:translate(1px,1px)}
  .pp-bar button.act{background:#ff8a3d;color:#1b1208}
  `;

  const BTNS = [
    ['tea', '茶', '喝茶'], ['punch', '拳', '练拳'],
    ['dummy', '桩', '打木人桩'], ['kick', '踢', '高踢腿'],
    ['squat', '蹲', '叶问蹲'], ['happy', '乐', '开心一下'],
    ['wander', '走', '自动走动'],
    ['sound', '声', '音效'],
    ['close', '×', '收起挂件']
  ];

  /* ============================================================
   *  6. 挂件实例
   * ============================================================ */
  const DEFAULTS = {
    size: 160, position: 'bottom-right', margin: 24,
    sound: false, wander: true, controls: true, bubble: true,
    drop: true, zIndex: 2147483000, target: null,
    hello: '咦，这是你的网站？'
  };

  const pets = [];
  let rafId = 0, lastT = 0;

  function loop(t) {
    const dt = lastT ? Math.min(0.06, (t - lastT) / 1000) : 0.016;
    lastT = t;
    for (let i = 0; i < pets.length; i++) pets[i].update(dt);
    rafId = window.requestAnimationFrame(loop);
  }
  function startLoop() {
    if (!rafId) { lastT = 0; rafId = window.requestAnimationFrame(loop); }
  }
  function stopLoop() {
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }

  class PixelPet {
    constructor(opts) {
      this.opts = Object.assign({}, DEFAULTS, opts || {});
      this.size = clamp(this.opts.size, 64, 420);
      this.wander = this.opts.wander !== false;
      this.sndOn = !!this.opts.sound;
      this.mounted = false;
      this.inline = false;
      this.W = 800; this.H = 600;
      this.x = 0; this.y = 0; this.vy = 0; this.vx = 0;
      this.groundY = 0; this.minX = 0; this.maxX = 0;
      this.state = 'ground';       // ground | air | drag
      this.dragging = false;
      this.pointerId = null;
      this.dir = 1;
      this._dragDir = 0;          /* 拖拽过程中的水平方向，决定空翻朝向 */
      this.goalX = null;
      this.tilt = 0; this.squash = 0; this.dustT = 0;
      this.spin = 0; this.spinV = 0; this.spinTarget = 0; this.spinSettling = false;
      this.idleSec = 0; this.think = 12 + Math.random() * 8; this.bubbleCd = 0;
      this.anim = 'idle'; this.frames = ANIM.idle.frames; this.fi = 0; this.elapsed = 0;
      this.mode = 'loop'; this.fromPose = null; this._onceCb = null;
      this._bt = 0; this._barT = 0; this._firstLand = true;
      this._onResize = () => this.resize();
      this._place = this._place.bind(this);
    }

    /* ---------- 挂载 ---------- */
    mount(target) {
      if (this.mounted) return this;
      target = target || this.opts.target;

      const host = document.createElement('div');
      host.setAttribute('data-pixel-pet', '');
      if (target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) throw new Error('[PixelPet] 找不到挂载容器: ' + target);
        if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
        host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:' + (this.opts.zIndex || 1);
        el.appendChild(host);
        this.inline = true;
      } else {
        host.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:' + this.opts.zIndex;
        document.body.appendChild(host);
      }
      this.host = host;
      this.root = host.attachShadow({ mode: 'open' });
      this.root.innerHTML =
        '<style>' + CSS + '</style>' +
        '<div class="pp-pet"><canvas width="' + VW + '" height="' + VH + '"></canvas></div>' +
        '<div class="pp-bubble"></div>' +
        (this.opts.controls === false ? '' : '<div class="pp-bar">' + BTNS.map(b =>
          '<button data-k="' + b[0] + '" title="' + b[2] + '" aria-label="' + b[2] + '">' + b[1] + '</button>').join('') + '</div>');

      this.el = this.root.querySelector('.pp-pet');
      this.canvas = this.root.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.bubble = this.root.querySelector('.pp-bubble');
      this.bar = this.root.querySelector('.pp-bar');

      this.el.style.width = this.size + 'px';
      this.el.style.height = (this.size * VH / VW) + 'px';

      this._bind();
      this.measure();
      this._initialPlace();

      this.mounted = true;
      pets.push(this);
      startLoop();
      window.addEventListener('resize', this._onResize);

      /* 页面加载时鼠标可能已经停在挂件位置上，不会产生 pointerenter，补一次检测 */
      window.setTimeout(() => {
        if (!this.mounted || !this.bar || this.dragging) return;
        if (this.el.matches(':hover')) this._bar(true, 2000);
      }, 700);

      if (this.opts.drop === false) {
        this.state = 'ground';
        this.play('idle', 'loop');
        window.setTimeout(() => this.say(this.opts.hello), 900);
      } else {
        this.state = 'air';
        this.vy = 0;
        this.play('fall', 'loop');
        this._armFlip();
      }
      return this;
    }

    _bind() {
      const el = this.el;
      el.addEventListener('pointerdown', e => this._down(e));
      el.addEventListener('pointermove', e => this._move(e));
      el.addEventListener('pointerup', e => this._up(e));
      el.addEventListener('pointercancel', e => this._up(e));
      el.addEventListener('pointerenter', () => this._bar(true));
      el.addEventListener('pointerleave', () => this._bar(false));

      if (!this.bar) return;
      const b = this.bar;
      b.addEventListener('pointerenter', () => this._bar(true));
      b.addEventListener('pointerleave', () => this._bar(false));
      if (this.sndOn) { const s = b.querySelector('[data-k="sound"]'); if (s) s.classList.add('act'); }
      if (this.wander) { const w = b.querySelector('[data-k="wander"]'); if (w) w.classList.add('act'); }
      b.addEventListener('click', e => {
        const btn = e.target.closest('button[data-k]');
        if (!btn) return;
        const k = btn.getAttribute('data-k');
        if (k === 'close') { this.destroy(); return; }
        if (k === 'sound') {
          this.sndOn = !this.sndOn;
          btn.classList.toggle('act', this.sndOn);
          if (this.sndOn) beep('happy', true);
          return;
        }
        if (k === 'wander') {
          this.wander = !this.wander;
          btn.classList.toggle('act', this.wander);
          this.goalX = null;
          this.say(this.wander ? '那我随便逛逛。' : '好，我就在这儿站着。');
          return;
        }
        this.react(k);
      });
    }

    _bar(show, hold) {
      if (!this.bar) return;
      window.clearTimeout(this._barT);
      if (show) {
        this.bar.classList.add('on');
      } else {
        this._barT = window.setTimeout(() => this.bar.classList.remove('on'), hold || 460);
      }
    }

    /* ---------- 尺寸与位置 ---------- */
    measure() {
      this.W = this.host.clientWidth || window.innerWidth || 300;
      this.H = this.host.clientHeight || window.innerHeight || 300;
      this.groundY = this.H - (this.inline ? 4 : 12);
      const half = this.size * 0.36;
      this.minX = half;
      this.maxX = Math.max(half + 1, this.W - half);
    }

    _initialPlace() {
      const p = this.opts.position, m = this.opts.margin, half = this.size / 2;
      let x;
      if (typeof p === 'number') x = p;
      else if (p === 'bottom-left' || p === 'top-left') x = half + m;
      else if (p === 'center') x = this.W / 2;
      else x = this.W - half - m;
      this.x = clamp(x, this.minX, this.maxX);
      this.y = this.groundY;
      if (this.opts.drop !== false) this.y = this.groundY - this.size * 1.05;
    }

    _place() {
      const s = this.size;
      const left = this.x - s / 2;
      const top = this.y - s * GROUND / VW;
      const sy = 1 - this.squash * 0.16, sx = 1 + this.squash * 0.12;
      this.el.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + top.toFixed(1) + 'px,0) rotate(' +
        this.tilt.toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';

      /* 气泡 */
      const headTop = this.y - s * 0.72;
      const below = headTop < 84;
      if (this.bubble) {
        this.bubble.classList.toggle('below', below);
        const bw = this._bubbleW || 90;
        const bh = this._bubbleH || 26;
        const bx = clamp(this.x, bw / 2 + 6, Math.max(bw / 2 + 6, this.W - bw / 2 - 6));
        const bt = below ? this.y + 6 : Math.max(bh + 8, headTop);
        this.bubble.style.left = bx.toFixed(1) + 'px';
        this.bubble.style.top = bt.toFixed(1) + 'px';
      }
      /* 控制栏 */
      if (this.bar) {
        if (!this._bw) { this._bw = this.bar.offsetWidth || 64; this._bh = this.bar.offsetHeight || 124; }
        let bx = this.x + s * 0.5 + 4;
        if (bx + this._bw > this.W - 2) bx = this.x - s * 0.5 - this._bw - 4;
        bx = clamp(bx, 2, Math.max(2, this.W - this._bw - 2));
        let by = clamp(this.y - s * 0.72, 2, Math.max(2, this.H - this._bh - 2));
        this.bar.style.left = bx.toFixed(1) + 'px';
        this.bar.style.top = by.toFixed(1) + 'px';
      }
    }

    resize() {
      if (!this.mounted) return;
      const wasGround = this.state === 'ground';
      this.measure();
      this.x = clamp(this.x, this.minX, this.maxX);
      if (wasGround) this.y = this.groundY;
      else this.y = Math.min(this.y, this.groundY);
      this._bw = 0;
    }

    /* ---------- 指针 ---------- */
    _down(e) {
      if (e.button !== undefined && e.button !== 0) return;
      this.pointerId = e.pointerId;
      this._sx = e.clientX; this._sy = e.clientY;
      this._px = this.x; this._py = this.y;
      this.dragging = false;
      this._dragDir = 0;
      this.el.classList.add('grabbing');
      this._bar(true);
      try { this.el.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault();
    }
    _move(e) {
      if (this.pointerId === null || e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this._sx, dy = e.clientY - this._sy;
      if (!this.dragging && Math.hypot(dx, dy) > 5) {
        this.dragging = true;
        this.state = 'drag';
        this.goalX = null;
        this.vy = 0;
        this.play('drag', 'loop');
        this.say(pick(['喂喂，放我下来！', '轻点轻点…', '要飞起来了！', '轻功也是功！', '想领教一下？']));
      }
      if (this.dragging) {
        this.x = clamp(this._px + dx, this.size * 0.3, this.W - this.size * 0.3);
        this.y = clamp(this._py + dy, -this.size, this.groundY + this.size);
        this.tilt = clamp(-dx * 0.05, -14, 14);
        /* 记住水平拖拽方向：松手后空翻朝这个方向 */
        if (Math.abs(dx) > 6) this._dragDir = dx > 0 ? 1 : -1;
      }
    }
    _up(e) {
      if (this.pointerId === null) return;
      this.pointerId = null;
      this.el.classList.remove('grabbing');
      if (this.dragging) {
        this.dragging = false;
        this.state = 'air';
        this.vy = 40;
        this.vx = 0;
        /* 朝拖拽方向翻：dir<0 时整宠镜像渲染，正自旋等效反向，两个方向都是前滚 */
        if (this._dragDir) this.dir = this._dragDir;
        this.play('fall', 'loop');
        this._armFlip();
      } else {
        if (e && e.pointerType === 'touch') this._bar(true, 4200);
        else this._tap();
      }
    }

    _tap() {
      this.idleSec = 0;
      this.think = 14 + Math.random() * 10;
      this.goalX = null;
      if (this.anim === 'sleep') {
        this.play('idle', 'loop');
        this.say('唔…醒了。');
        return;
      }
      if (Math.random() < 0.55) {
        this.play('happy', 'once');
        this.say(pick(['嘿嘿。', '别戳啦～', '精神了！', '摸头有用哦。', '练武之人，切忌心浮气躁。']));
        beep('happy', this.sndOn);
      } else {
        this.play('punch', 'once');
        this.say(pick(['要比划一下？', '看招！', '咏春，请。', '我要打十个！', '天下武功，唯快不破！', '无所谓的。']));
      }
    }

    /* ---------- 动作 ---------- */
    play(name, mode, cb) {
      if (!ANIM[name]) return this;
      this.anim = name;
      this.frames = ANIM[name].frames;
      this.fi = 0; this.elapsed = 0; this.fromPose = null;
      this.mode = mode || (ANIM[name].loop ? 'loop' : 'once');
      this._onceCb = cb || null;
      this._enter(this.frames[0]);
      return this;
    }

    _enter(f) {
      if (f.say && this.opts.bubble !== false && this.bubbleCd <= 0) {
        this.say(f.say);
        this.bubbleCd = 6;
      }
      if (f.sfx) beep(f.sfx, this.sndOn);
    }

    _frameAnim(dt) {
      const f = this.frames[this.fi];
      this.elapsed += dt * 1000;
      if (this.elapsed >= f.tw + f.hold) {
        if (this.mode === 'once' && this.fi === this.frames.length - 1) {
          const cb = this._onceCb;
          this._onceCb = null;
          this.play('idle', 'loop');
          this.idleSec = 0;
          this.think = 14 + Math.random() * 10;
          if (cb) cb();
          return;
        }
        this.fromPose = f.p;
        this.fi = (this.fi + 1) % this.frames.length;
        this.elapsed = 0;
        this._enter(this.frames[this.fi]);
      }
    }

    currentPose() {
      const f = this.frames[this.fi];
      const t = f.tw > 0 ? Math.min(1, this.elapsed / f.tw) : 1;
      return this.fromPose ? lerpPose(this.fromPose, f.p, t) : f.p;
    }

    /* ---------- 行为 ---------- */
    react(k) {
      if (!ANIM[k]) return;
      this.idleSec = 0;
      this.goalX = null;
      this.state = 'ground';
      this.bubbleCd = 0;          /* 用户主动点的，别被上一句话的冷却压住 */
      this.play(k, 'once');
    }

    _decide() {
      if (this.state !== 'ground' || this.dragging) return;
      this.think = 14 + Math.random() * 10;

      if (this.anim === 'sleep') {
        if (Math.random() < 0.3) { this.play('idle', 'loop'); this.idleSec = 0; }
        this.think = 12 + Math.random() * 10;
        return;
      }
      if (this.idleSec > 75) { this.play('sleep', 'loop'); this.say('先睡一会儿…'); return; }
      if (this.idleSec > 34) { this.play('bored', 'loop'); return; }

      const r = Math.random();
      if (this.wander && r < 0.45) { this._wander(); return; }
      if (r < 0.72) { this._autoAction(); return; }
      this.play('idle', 'loop');
    }

    _wander() {
      if (this.maxX - this.minX < 8) return;
      let target = this.minX + Math.random() * (this.maxX - this.minX);
      if (Math.abs(target - this.x) < this.size * 0.5) {
        target = this.x < this.W / 2 ? this.maxX : this.minX;
      }
      this.goalX = clamp(target, this.minX, this.maxX);
      this.dir = this.goalX < this.x ? -1 : 1;
      this.play('walk', 'loop');
      this.idleSec = 0;
    }

    _autoAction() {
      const pool = ACTION_POOL.slice();
      if (this.x > this.size * 0.9) pool.push('dummy');
      this.play(pick(pool), 'once');
    }

    /* 高处掉落：按预计下落时间算好整圈数，落地时正好转正 */
    _armFlip() {
      const h = this.groundY - this.y;
      this.spin = 0; this.spinV = 0; this.spinSettling = false; this.spinTarget = 0;
      if (h < this.size * 0.5) return;
      const a = 2400, v0 = Math.max(0, this.vy);
      const t = (-v0 + Math.sqrt(v0 * v0 + 2 * a * h)) / a;
      if (t < 0.24) return;
      const turns = clamp(Math.round(t / 0.46), 1, 3);
      this.spinV = (Math.PI * 2 * turns) / t;
      this.play('tumble', 'loop');
    }

    _physics(dt) {
      this.vy += 2400 * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.22, dt);
      this.x = clamp(this.x, this.minX, this.maxX);
      if (this.spinV) this.spin += this.spinV * dt;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        if (this.vy > 420) {
          this.vy = -this.vy * 0.32;
          this.squash = 0.55;
          this.dustT = 0.36;
          beep('land', this.sndOn);
        } else {
          this.vy = 0; this.vx = 0;
          this.state = 'ground';
          this.tilt = 0;
          this.squash = 0.8;
          this.dustT = 0.4;
          /* 空翻收尾：把旋转缓到最近的整圈，看起来是转正站稳 */
          if (this.spinV) {
            this.spinV = 0;
            this.spinTarget = Math.round(this.spin / (Math.PI * 2)) * (Math.PI * 2);
            this.spinSettling = true;
          }
          this.play('land', 'once');
          beep('land', this.sndOn);
          if (this._firstLand) {
            this._firstLand = false;
            window.setTimeout(() => { if (this.mounted) this.say(this.opts.hello); }, 700);
          }
        }
      }
    }

    update(dt) {
      if (!this.mounted) return;
      this._frameAnim(dt);
      if (this.bubbleCd > 0) this.bubbleCd -= dt;
      if (this.dustT > 0) this.dustT -= dt;

      if (this.state === 'air') {
        this._physics(dt);
      } else if (this.state === 'ground') {
        if (this.goalX !== null) {
          const d = this.goalX - this.x;
          const step = this.size * 0.52 * dt;
          if (Math.abs(d) <= step) {
            this.x = this.goalX;
            this.goalX = null;
            this.dir = d < 0 ? -1 : 1;
            this.play('idle', 'loop');
            this.idleSec = 0;
            this.think = 6 + Math.random() * 8;
          } else {
            this.dir = d < 0 ? -1 : 1;
            this.x += Math.sign(d) * step;
          }
        } else {
          this.idleSec += dt;
          this.think -= dt;
          if (this.think <= 0) this._decide();
        }
      }

      if (this.spinSettling) {
        const d = this.spinTarget - this.spin;
        this.spin += d * Math.min(1, dt * 20);
        if (Math.abs(d) < 0.04) {
          this.spin = 0; this.spinTarget = 0; this.spinSettling = false;
        }
      } else if (this.state !== 'air' && this.spin) {
        this.spin = 0;
      }

      if (this.tilt) {
        this.tilt *= Math.pow(0.0008, dt);
        if (Math.abs(this.tilt) < 0.2) this.tilt = 0;
      }
      if (this.squash > 0) {
        this.squash -= dt * 3.4;
        if (this.squash < 0) this.squash = 0;
      }
      this._place();
      this._render();
    }

    _render() {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, VW, VH);
      g = c;
      const p = this.currentPose();
      const flip = this.dir < 0;
      const lift = clamp((this.groundY - this.y) / (this.size * 0.8), 0, 3);

      /* 地面阴影不参与人物的朝向和空翻变换。 */
      drawShadow(p.ox, lift);

      if (flip) { c.save(); c.translate(VW, 0); c.scale(-1, 1); }
      /* 道具与人物共用左右镜像，保持木桩、茶座与手的位置一致；
         放在空翻变换之前绘制，避免道具跟着人物旋转。 */
      if (p.prop === 'dummy') drawDummy(p.ox, p.oy);
      if (p.prop === 'tea') drawTeaStand(p.ox);
      if (this.spin) {
        c.save();
        c.translate(VW / 2, 36); c.rotate(this.spin); c.translate(-VW / 2, -36);
      }
      if (p.side) drawPetSide(p); else drawPet(p);
      drawFx(p, performance.now());
      if (this.spin) c.restore();

      if (this.dustT > 0) {
        const t = 1 - this.dustT / 0.4, y = 132;
        c.globalAlpha = Math.max(0, 1 - t);
        R(52 - t * 10, y, 6, 3, '#ffffff');
        R(100 + t * 10, y, 6, 3, '#ffffff');
        R(44 - t * 14, y - 3, 4, 3, '#ffffff');
        R(108 + t * 14, y - 3, 4, 3, '#ffffff');
        c.globalAlpha = 1;
      }
      if (flip) c.restore();
    }

    /* ---------- 对外 API ---------- */
    say(text, ms) {
      if (!this.bubble || this.opts.bubble === false) return this;
      if (!text) return this;
      this.bubble.textContent = text;
      this.bubble.classList.add('on');
      this._bubbleW = this.bubble.offsetWidth;
      this._bubbleH = this.bubble.offsetHeight;
      window.clearTimeout(this._bt);
      this._bt = window.setTimeout(() => this.bubble.classList.remove('on'), ms || 2600);
      this._place();
      return this;
    }
    setSize(n) {
      this.size = clamp(n, 64, 420);
      this.el.style.width = this.size + 'px';
      this.el.style.height = (this.size * VH / VW) + 'px';
      this.measure();
      this.x = clamp(this.x, this.minX, this.maxX);
      return this;
    }
    moveTo(x, y) {
      this.x = clamp(x, this.minX, this.maxX);
      this.y = y === undefined ? this.groundY : y;
      this.state = 'air';
      this.vy = 0;
      return this;
    }
    setSound(on) {
      this.sndOn = !!on;
      const b = this.bar && this.bar.querySelector('[data-k="sound"]');
      if (b) b.classList.toggle('act', this.sndOn);
      return this;
    }
    destroy() {
      if (!this.mounted) return;
      this.mounted = false;
      window.clearTimeout(this._bt);
      window.clearTimeout(this._barT);
      window.removeEventListener('resize', this._onResize);
      if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
      const i = pets.indexOf(this);
      if (i >= 0) pets.splice(i, 1);
      if (!pets.length) stopLoop();
    }
  }

  /* ============================================================
   *  7. 对外接口 + 一行引入自动初始化
   * ============================================================ */
  PixelPet.__pp = true;
  PixelPet.version = '1.0.0';
  PixelPet.create = function (opts) {
    const p = new PixelPet(opts);
    p.mount(opts && opts.target);
    return p;
  };
  PixelPet.init = PixelPet.create;
  PixelPet.instances = pets;

  window.PixelPet = PixelPet;

  function autoInit() {
    const s = document.currentScript || document.querySelector('script[data-pet]');
    if (!s || !s.hasAttribute('data-pet')) return;
    const d = s.dataset;
    const opts = {
      size: d.size ? parseInt(d.size, 10) : 160,
      position: d.position || 'bottom-right',
      sound: d.sound !== undefined && d.sound !== 'false',
      wander: d.wander !== 'false',
      controls: d.controls !== 'false',
      bubble: d.bubble !== 'false',
      drop: d.drop !== 'false'
    };
    if (d.zindex) opts.zIndex = parseInt(d.zindex, 10);
    if (d.hello) opts.hello = d.hello;
    PixelPet.instance = PixelPet.create(opts);
  }

  if (document.body) autoInit();
  else document.addEventListener('DOMContentLoaded', autoInit, { once: true });
})(window, document);
