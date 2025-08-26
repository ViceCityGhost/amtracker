// Catalog data + derived genre list
export const CATALOG = [
  // Anime
  { id: 'a1', type: 'Anime', title: 'Spirited Away', year: 2001, genres: ['Fantasy','Adventure'], image: 'https://placehold.co/300x420?text=Spirited+Away', synopsis: 'A girl enters a spirit world and works at a bathhouse to free her parents.' },
  { id: 'a2', type: 'Anime', title: 'Attack on Titan', year: 2013, genres: ['Action','Thriller','Drama','Fantasy'], image: 'https://placehold.co/300x420?text=Attack+on+Titan', synopsis: 'Humanity fights titans within colossal walls in a grim struggle for survival.' },
  { id: 'a3', type: 'Anime', title: 'Your Name', year: 2016, genres: ['Romance','Drama','Supernatural'], image: 'https://placehold.co/300x420?text=Your+Name', synopsis: 'Two teens mysteriously swap bodies and form a connection across time.' },
  { id: 'a4', type: 'Anime', title: 'Fullmetal Alchemist: Brotherhood', year: 2009, genres: ['Action','Adventure','Fantasy'], image: 'https://placehold.co/300x420?text=FMA:+Brotherhood', synopsis: 'Brothers use alchemy on a quest to restore their bodies after a tragic ritual.' },
  { id: 'a5', type: 'Anime', title: 'Jujutsu Kaisen', year: 2020, genres: ['Action','Supernatural'], image: 'https://placehold.co/300x420?text=Jujutsu+Kaisen', synopsis: 'A student ingests a cursed object and joins sorcerers to fight curses.' },
  { id: 'a6', type: 'Anime', title: 'Demon Slayer', year: 2019, genres: ['Action','Adventure','Fantasy'], image: 'https://placehold.co/300x420?text=Demon+Slayer', synopsis: 'A boy joins the Demon Slayer Corps after his family is slain by demons.' },
  { id: 'a7', type: 'Anime', title: 'Haikyuu!!', year: 2014, genres: ['Sports','Slice of Life'], image: 'https://placehold.co/300x420?text=Haikyuu!!', synopsis: 'A short volleyball enthusiast aims to soar with teamwork and grit.' },
  { id: 'a8', type: 'Anime', title: 'Violet Evergarden', year: 2018, genres: ['Drama','Slice of Life','Romance'], image: 'https://placehold.co/300x420?text=Violet+Evergarden', synopsis: 'A former soldier writes letters for others while discovering her own emotions.' },
  { id: 'a9', type: 'Anime', title: 'Death Note', year: 2006, genres: ['Thriller','Mystery','Supernatural'], image: 'https://placehold.co/300x420?text=Death+Note', synopsis: 'A student finds a deadly notebook and battles a genius detective.' },
  { id: 'a10', type: 'Anime', title: 'One Piece', year: 1999, genres: ['Action','Adventure','Comedy'], image: 'https://placehold.co/300x420?text=One+Piece', synopsis: 'Pirates sail the Grand Line in search of the legendary treasure One Piece.' },
  { id: 'a11', type: 'Anime', title: 'Naruto', year: 2002, genres: ['Action','Adventure'], image: 'https://placehold.co/300x420?text=Naruto', synopsis: 'A ninja outcast dreams of becoming Hokage and earning respect.' },
  { id: 'a12', type: 'Anime', title: 'Monster', year: 2004, genres: ['Thriller','Mystery','Psychological'], image: 'https://placehold.co/300x420?text=Monster', synopsis: 'A doctor pursues a former patient who becomes a chilling killer.' },
  { id: 'a13', type: 'Anime', title: 'Made in Abyss', year: 2017, genres: ['Adventure','Fantasy','Horror'], image: 'https://placehold.co/300x420?text=Made+in+Abyss', synopsis: 'A girl and a robot descend into a vast, perilous abyss to find her mother.' },
  { id: 'a14', type: 'Anime', title: 'Toradora!', year: 2008, genres: ['Romance','Comedy','Slice of Life'], image: 'https://placehold.co/300x420?text=Toradora!', synopsis: 'Two classmates help each other with crushes and find unexpected love.' },
  { id: 'a15', type: 'Anime', title: 'Kaguya-sama: Love Is War', year: 2019, genres: ['Romance','Comedy'], image: 'https://placehold.co/300x420?text=Kaguya-sama', synopsis: 'Two elite students wage mind games to make the other confess first.' },
  { id: 'a16', type: 'Anime', title: 'Steins;Gate', year: 2011, genres: ['Sci-Fi','Thriller'], image: 'https://placehold.co/300x420?text=Steins;Gate', synopsis: 'Friends accidentally create a time machine and face dire consequences.' },
  // Manga
  { id: 'm1', type: 'Manga', title: 'Berserk', year: 1989, genres: ['Action','Dark Fantasy'], image: 'https://placehold.co/300x420?text=Berserk', synopsis: 'Guts fights fate in a brutal medieval world of demons and men.' },
  { id: 'm2', type: 'Manga', title: 'Chainsaw Man', year: 2018, genres: ['Action','Dark Fantasy','Horror'], image: 'https://placehold.co/300x420?text=Chainsaw+Man', synopsis: 'Denji becomes a devil hunter fused with a chainsaw devil.' },
  { id: 'm3', type: 'Manga', title: 'Oyasumi Punpun', year: 2007, genres: ['Psychological','Drama'], image: 'https://placehold.co/300x420?text=Oyasumi+Punpun', synopsis: 'A surreal, heavy coming-of-age tale.' },
  { id: 'm4', type: 'Manga', title: 'One Punch Man', year: 2012, genres: ['Action','Comedy'], image: 'https://placehold.co/300x420?text=One+Punch+Man', synopsis: 'Saitama can defeat any foe with one punch.' },
  { id: 'm5', type: 'Manga', title: 'Solo Leveling', year: 2016, genres: ['Action','Fantasy'], image: 'https://placehold.co/300x420?text=Solo+Leveling', synopsis: 'A weak hunter grows absurdly strong by clearing dungeons.' },
  { id: 'm6', type: 'Manga', title: 'Tokyo Ghoul', year: 2011, genres: ['Action','Horror','Thriller'], image: 'https://placehold.co/300x420?text=Tokyo+Ghoul', synopsis: 'A student becomes half-ghoul and struggles between worlds.' },
  { id: 'm7', type: 'Manga', title: 'Blue Period', year: 2017, genres: ['Drama','Slice of Life'], image: 'https://placehold.co/300x420?text=Blue+Period', synopsis: 'A teen discovers art and pursues Tokyo Geidai.' },
  { id: 'm8', type: 'Manga', title: "Komi Can't Communicate", year: 2016, genres: ['Romance','Comedy'], image: 'https://placehold.co/300x420?text=Komi-san', synopsis: 'Komi aims for 100 friends despite social anxiety.' },
  { id: 'm9', type: 'Manga', title: 'Horimiya', year: 2011, genres: ['Romance','Slice of Life'], image: 'https://placehold.co/300x420?text=Horimiya', synopsis: 'A hidden goth boy and a popular girl connect.' },
  { id: 'm10', type: 'Manga', title: 'Vinland Saga', year: 2005, genres: ['Action','Adventure','Historical'], image: 'https://placehold.co/300x420?text=Vinland+Saga', synopsis: 'A Viking boy seeks revenge then peace.' },
  { id: 'm11', type: 'Manga', title: 'Frieren: Beyond Journey’s End', year: 2020, genres: ['Fantasy','Adventure'], image: 'https://placehold.co/300x420?text=Frieren', synopsis: 'An elf mage reflects on mortality.' },
];
export const ALL_GENRES = Array.from(new Set(CATALOG.flatMap(x => x.genres))).sort();
