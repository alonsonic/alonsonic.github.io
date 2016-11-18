//Letter A
var polygon = new mojs.Shape({
  shape:        'polygon',
  radius:       38,
  top:         '10%',
  left:         '10%',
  fill:         'yellow',
  isShowStart:  true,
});
 
//Letter L part1
var rect = new mojs.Shape({
  shape:        'rect',
  radius:       20,
  radiusX:      10,
  top:         '9%',
  left:         '18%',
  fill:         'cyan',
  isShowStart:  true,
});

//Letter L part2
var rect = new mojs.Shape({
  shape:        'rect',
  radius:       20,
  radiusY:      5,
  top:         '11%',
  left:         '20%',
  fill:         'cyan',
  isShowStart:  true,
});

//Letter O
var circle = new mojs.Shape({
  shape:        'circle',
  radius:       20,
  top:          '9%',
  left:         '28%',
  fill:         { 'cyan': 'deeppink', easing: 'cubic.in' },
  isShowStart:  true,

  scale:         { 0 : 1 },
  duration:      1000,
  delay:         1000,
  easing:        'cubic.out'
}).play();

//Letter N
var zigzag = new mojs.Shape({
  shape:        'zigzag',
  points:       4,
  radius:       25,
  radiusY:      40,
  angle:        -5,
  left:         '38%',
  top:          '12%',
  fill:         'none',
  stroke:       '#49F2CC',
  strokeWidth:  10,
  isShowStart:   true,
});

//Letter S part1
var curve = new mojs.Shape({
  shape:        'curve',    
  radius:       15,
  radiusY:      20,
  angle:        -70,
  top:          '6.3%',
  left:         '48%',
  fill:         'none',
  stroke:       'deeppink',
  strokeWidth:  { 0: 6 },
  isShowStart:   true,
  strokeDasharray: '100%',
  strokeDashoffset: { '100%' : '-100%' },

  duration:     2000,
  repeat: 100
}).play();

//Letter S part2
var curve = new mojs.Shape({
  shape:        'curve',    
  radius:       20,
  radiusY:      30,
  angle:        110,
  top:          '10.6%',
  left:         '45.5%',
  fill:         'none',
  stroke:       'deeppink',
  strokeWidth:  { 0: 6 },
  isShowStart:   true,
  strokeDasharray: '100%',
  strokeDashoffset: { '100%' : '-100%' },

  duration:     2000
}).then({
  strokeDashoffset: "100%",
}).play();

//Letter O
var circle = new mojs.Shape({
  shape:        'circle',
  radius:       22,
  top:          '9%',
  left:         '54%',
  fill:         { 'deeppink': 'cyan', easing: 'cubic.in' },
  isShowStart:  true,

  scale:         { 0 : 1 },
  duration:      1000,
  delay:         1000,
  easing:        'cubic.out'
}).play();