export type Tier = 'GOAT' | 'Legend' | 'Elite';

export interface Player {
  id: string;
  name: string;
  team: string;
  years: string;
  stats: string;
  rating: number;
  tier: Tier;
  position: Position;
}

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'EDGE' | 'DT' | 'LB' | 'CB' | 'S' | 'D-FLEX';

export const DRAFT_POSITIONS: Position[] = [
  'QB', 'RB', 'WR', 'TE', 'FLEX', 'EDGE', 'DT', 'LB', 'CB', 'S', 'D-FLEX',
];

export const PLAYERS: Record<Position, Player[]> = {
  QB: [
    { id: 'tb12', name: 'Tom Brady', team: 'NE/TB', years: '2000–2022', stats: '89,214 yds • 649 TD', rating: 99, tier: 'GOAT', position: 'QB' },
    { id: 'jm16', name: 'Joe Montana', team: 'SF/KC', years: '1979–1994', stats: '40,551 yds • 273 TD', rating: 97, tier: 'Legend', position: 'QB' },
    { id: 'pm18', name: 'Peyton Manning', team: 'IND/DEN', years: '1998–2015', stats: '71,940 yds • 539 TD', rating: 96, tier: 'Legend', position: 'QB' },
    { id: 'ar12', name: 'Aaron Rodgers', team: 'GB/NYJ', years: '2005–pres', stats: '59,055 yds • 475 TD', rating: 94, tier: 'Elite', position: 'QB' },
    { id: 'jb9', name: 'John Elway', team: 'DEN', years: '1983–1998', stats: '51,475 yds • 300 TD', rating: 94, tier: 'Elite', position: 'QB' },
    { id: 'ds4', name: 'Dan Marino', team: 'MIA', years: '1983–1999', stats: '61,361 yds • 420 TD', rating: 95, tier: 'Legend', position: 'QB' },
  ],
  RB: [
    { id: 'bs20', name: 'Barry Sanders', team: 'DET', years: '1989–1998', stats: '15,269 yds • 99 TD', rating: 99, tier: 'GOAT', position: 'RB' },
    { id: 'es22', name: 'Emmitt Smith', team: 'DAL/ARI', years: '1990–2004', stats: '18,355 yds • 164 TD', rating: 97, tier: 'Legend', position: 'RB' },
    { id: 'lt21', name: 'LaDainian Tomlinson', team: 'SD/NYJ', years: '2001–2011', stats: '13,684 yds • 145 TD', rating: 95, tier: 'Legend', position: 'RB' },
    { id: 'wp34', name: 'Walter Payton', team: 'CHI', years: '1975–1987', stats: '16,726 yds • 110 TD', rating: 98, tier: 'GOAT', position: 'RB' },
    { id: 'eg33', name: 'Eric Dickerson', team: 'LAR/IND', years: '1983–1993', stats: '13,259 yds • 90 TD', rating: 95, tier: 'Legend', position: 'RB' },
    { id: 'jb43', name: 'Jim Brown', team: 'CLE', years: '1957–1965', stats: '12,312 yds • 106 TD', rating: 99, tier: 'GOAT', position: 'RB' },
  ],
  WR: [
    { id: 'jr80', name: 'Jerry Rice', team: 'SF/OAK', years: '1985–2004', stats: '22,895 yds • 197 TD', rating: 99, tier: 'GOAT', position: 'WR' },
    { id: 'rm84', name: 'Randy Moss', team: 'MIN/NE', years: '1998–2012', stats: '15,292 yds • 156 TD', rating: 97, tier: 'Legend', position: 'WR' },
    { id: 'cj81', name: 'Calvin Johnson', team: 'DET', years: '2007–2015', stats: '11,619 yds • 83 TD', rating: 94, tier: 'Elite', position: 'WR' },
    { id: 'to81', name: 'Terrell Owens', team: 'SF/PHI/DAL', years: '1996–2010', stats: '15,934 yds • 153 TD', rating: 95, tier: 'Legend', position: 'WR' },
    { id: 'ls17', name: 'Lynn Swann', team: 'PIT', years: '1974–1982', stats: '5,462 yds • 51 TD', rating: 90, tier: 'Elite', position: 'WR' },
    { id: 'mc13', name: 'Marvin Harrison', team: 'IND', years: '1996–2008', stats: '14,580 yds • 128 TD', rating: 95, tier: 'Legend', position: 'WR' },
  ],
  TE: [
    { id: 'rg87', name: 'Rob Gronkowski', team: 'NE/TB', years: '2010–2021', stats: '9,286 yds • 92 TD', rating: 98, tier: 'GOAT', position: 'TE' },
    { id: 'tg88', name: 'Tony Gonzalez', team: 'KC/ATL', years: '1997–2013', stats: '15,127 yds • 111 TD', rating: 97, tier: 'Legend', position: 'TE' },
    { id: 'tk87', name: 'Travis Kelce', team: 'KC', years: '2013–pres', stats: '12,105 yds • 76 TD', rating: 96, tier: 'Legend', position: 'TE' },
    { id: 'jw82', name: 'Jason Witten', team: 'DAL/LV', years: '2003–2020', stats: '13,046 yds • 74 TD', rating: 92, tier: 'Elite', position: 'TE' },
  ],
  FLEX: [
    { id: 'sp29', name: 'Sterling Sharpe', team: 'GB', years: '1988–1994', stats: '8,134 yds • 65 TD', rating: 93, tier: 'Elite', position: 'FLEX' },
    { id: 'ci85', name: 'Cris Carter', team: 'PHI/MIN', years: '1987–2002', stats: '13,899 yds • 130 TD', rating: 94, tier: 'Elite', position: 'FLEX' },
    { id: 'ah83', name: 'Antonio Brown', team: 'PIT/OAK', years: '2010–2021', stats: '12,291 yds • 83 TD', rating: 93, tier: 'Elite', position: 'FLEX' },
    { id: 'dm88', name: 'Darren Sproles', team: 'SD/NO/PHI', years: '2005–2019', stats: '7,136 rush+rec yds', rating: 88, tier: 'Elite', position: 'FLEX' },
  ],
  EDGE: [
    { id: 'lt56', name: 'Lawrence Taylor', team: 'NYG', years: '1981–1993', stats: '132.5 sacks • 2× DPOY', rating: 99, tier: 'GOAT', position: 'EDGE' },
    { id: 'rw92', name: 'Reggie White', team: 'PHI/GB', years: '1985–2000', stats: '198 sacks • 2× DPOY', rating: 99, tier: 'GOAT', position: 'EDGE' },
    { id: 'dj75', name: 'Deacon Jones', team: 'LAR/SD', years: '1961–1974', stats: 'Coined the sack • HOF', rating: 97, tier: 'Legend', position: 'EDGE' },
    { id: 'bm55', name: 'Bruce Smith', team: 'BUF/WAS', years: '1985–2003', stats: '200 sacks • HOF', rating: 97, tier: 'Legend', position: 'EDGE' },
  ],
  DT: [
    { id: 'ma99', name: 'Merlin Olsen', team: 'LAR', years: '1962–1976', stats: '14× Pro Bowl • HOF', rating: 97, tier: 'Legend', position: 'DT' },
    { id: 'ba99', name: 'Bob Lilly', team: 'DAL', years: '1961–1974', stats: '11× Pro Bowl • HOF', rating: 96, tier: 'Legend', position: 'DT' },
    { id: 'wa99', name: 'Warren Sapp', team: 'TB/OAK', years: '1995–2007', stats: '96.5 sacks • 1× DPOY', rating: 95, tier: 'Legend', position: 'DT' },
    { id: 'ao91', name: 'Aaron Donald', team: 'LAR', years: '2014–2022', stats: '111 sacks • 3× DPOY', rating: 99, tier: 'GOAT', position: 'DT' },
  ],
  LB: [
    { id: 'rl52', name: 'Ray Lewis', team: 'BAL', years: '1996–2012', stats: '2,061 tackles • 2× DPOY', rating: 99, tier: 'GOAT', position: 'LB' },
    { id: 'db51', name: 'Dick Butkus', team: 'CHI', years: '1965–1973', stats: '8× Pro Bowl • HOF', rating: 98, tier: 'GOAT', position: 'LB' },
    { id: 'js55', name: 'Junior Seau', team: 'SD/MIA/NE', years: '1990–2009', stats: '12× Pro Bowl • HOF', rating: 96, tier: 'Legend', position: 'LB' },
    { id: 'jl59', name: 'Jack Lambert', team: 'PIT', years: '1974–1984', stats: '9× Pro Bowl • HOF', rating: 96, tier: 'Legend', position: 'LB' },
  ],
  CB: [
    { id: 'ds21', name: 'Deion Sanders', team: 'ATL/SF/DAL', years: '1989–2005', stats: '53 INT • 2× SB Champ', rating: 99, tier: 'GOAT', position: 'CB' },
    { id: 'rw26', name: 'Rod Woodson', team: 'PIT/SF/BAL', years: '1987–2003', stats: '71 INT • 1× DPOY', rating: 98, tier: 'GOAT', position: 'CB' },
    { id: 'dr24', name: 'Darrelle Revis', team: 'NYJ/TB/KC', years: '2007–2017', stats: '29 INT • 7× Pro Bowl', rating: 95, tier: 'Legend', position: 'CB' },
    { id: 'mc26', name: 'Mike Haynes', team: 'NE/LAR', years: '1976–1989', stats: '46 INT • HOF', rating: 93, tier: 'Elite', position: 'CB' },
  ],
  S: [
    { id: 'rl42', name: 'Ronnie Lott', team: 'SF/LAR/NYJ', years: '1981–1994', stats: '63 INT • 4× SB Champ', rating: 99, tier: 'GOAT', position: 'S' },
    { id: 'er20', name: 'Ed Reed', team: 'BAL/HOU/NYJ', years: '2002–2013', stats: '64 INT • 1× DPOY', rating: 98, tier: 'GOAT', position: 'S' },
    { id: 'tp43', name: 'Troy Polamalu', team: 'PIT', years: '2003–2014', stats: '32 INT • 1× DPOY', rating: 96, tier: 'Legend', position: 'S' },
    { id: 'km21', name: 'Ken Houston', team: 'HOU/WAS', years: '1967–1980', stats: '49 INT • HOF', rating: 95, tier: 'Legend', position: 'S' },
  ],
  'D-FLEX': [
    { id: 'ms55', name: 'Mike Singletary', team: 'CHI', years: '1981–1992', stats: '10× Pro Bowl • HOF', rating: 96, tier: 'Legend', position: 'D-FLEX' },
    { id: 'na56', name: 'Nnamdi Asomugha', team: 'OAK/PHI', years: '2003–2013', stats: '19 INT • 3× All-Pro', rating: 90, tier: 'Elite', position: 'D-FLEX' },
    { id: 'cl26', name: 'Cliff Harris', team: 'DAL', years: '1970–1979', stats: '29 INT • 6× Pro Bowl', rating: 91, tier: 'Elite', position: 'D-FLEX' },
    { id: 'ch99', name: 'Charles Haley', team: 'SF/DAL', years: '1986–1999', stats: '100.5 sacks • 5× SB', rating: 93, tier: 'Elite', position: 'D-FLEX' },
  ],
};

export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  GOAT: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  Legend: { bg: '#EDE9FE', text: '#4C1D95', border: '#7C3AED' },
  Elite: { bg: '#DBEAFE', text: '#1E3A8A', border: '#3B82F6' },
};
