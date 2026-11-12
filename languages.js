/* =========================================================
   NEUTYPE: typing languages (20)

   Each list is ordered roughly from most common to less common.
   "Common words" uses the first 60, "Random words" uses them all.
   English is built into app.js, so it has no list here.
   Words are single tokens (no spaces) so the typing engine can use them.
   ========================================================= */
window.NEUTYPE_LANGS = (() => {
  const L = (name, native, text) => ({ name, native, words: text.trim().split(/\s+/) });
  return {
    english: { name: 'English', native: 'English', words: null },

    filipino: L('Filipino', 'Filipino', `
      ako ikaw siya kami tayo kayo sila ang ng sa na at ay mga para hindi oo wala may mayroon ito iyon dito doon ano sino saan kailan bakit paano alin lahat ilan marami kaunti malaki maliit mabuti masama bago luma maganda pangit mabilis mabagal mainit malamig araw gabi umaga hapon tanghali linggo buwan taon oras ngayon bukas kahapon bahay paaralan trabaho kaibigan pamilya nanay tatay kapatid anak bata lalaki babae tao bayan lungsod daan sasakyan tubig pagkain kanin isda gulay prutas aklat sulat salita wika musika laro tulong salamat pakiusap patawad mahal buhay mundo`),

    cebuano: L('Cebuano', 'Bisaya', `
      ako ikaw siya kami kita kamo sila ang sa nga ug o kini kana mao dili oo wala naa aduna unsa kinsa asa ngano unsaon tanan daghan gamay dako maayo daotan bag-o karaan nindot pangit paspas hinay init bugnaw adlaw gabii buntag hapon udto semana bulan tuig oras karonugma kagahapon balay eskwelahan trabaho higala pamilya nanay tatay igsoon anak bata lalaki babaye tawo lungsod dalan sakyanan tubig pagkaon kan-on isda utanon prutas libro sulat pulong pinulongan musika dula tabang salamat palihug pasayloa gugma kinabuhi kalibutan paglaum`),

    spanish: L('Spanish', 'Español', `
      el la los las un una de que y a en es se no te lo le da su por son con para como pero más este sí ya o muy todo también fue había hay ser tiene hacer cuando hasta desde donde quien porque casa día noche tiempo año vida hombre mujer niño amigo familia trabajo escuela ciudad país mundo agua comida libro palabra idioma música juego ayuda gracias favor perdón amor bueno malo nuevo viejo grande pequeño rápido lento bonito feo caliente frío mañana tarde hoy ayer siempre nunca aquí allí ahora después antes mejor menos mucho poco nada algo`),

    french: L('French', 'Français', `
      le la les un une des de du et à en est que qui ne pas pour dans ce il elle nous vous ils sur avec son sa ses mais ou où donc car si plus très tout tous être avoir faire dire aller voir savoir pouvoir vouloir venir jour nuit temps année vie homme femme enfant ami famille travail école ville pays monde eau nourriture livre mot langue musique jeu aide merci pardon amour bon mauvais nouveau vieux grand petit rapide lent beau chaud froid matin soir hier demain toujours jamais ici maintenant avant après mieux moins beaucoup peu rien`),

    german: L('German', 'Deutsch', `
      der die das ein eine und ist nicht ich du er sie es wir ihr mit von zu in auf für an aus bei nach über unter vor als wie wenn aber oder auch noch schon sehr nur dann hier dort jetzt immer nie heute gestern morgen haben sein werden können müssen wollen machen gehen kommen sehen sagen wissen Tag Nacht Zeit Jahr Leben Mann Frau Kind Freund Familie Arbeit Schule Stadt Land Welt Wasser Essen Buch Wort Sprache Musik Spiel Hilfe danke bitte Liebe gut schlecht neu alt groß klein schnell langsam schön heiß kalt`),

    portuguese: L('Portuguese', 'Português', `
      o a os as um uma de que e em é não se do da com para por mais como mas foi ele ela eu tu nós vocês eles isso este esta muito já também só ou quando onde quem porque casa dia noite tempo ano vida homem mulher criança amigo família trabalho escola cidade país mundo água comida livro palavra língua música jogo ajuda obrigado favor desculpa amor bom mau novo velho grande pequeno rápido lento bonito feio quente frio manhã tarde hoje ontem amanhã sempre nunca aqui ali agora depois antes melhor menos pouco nada algo ser ter fazer ver saber poder querer`),

    italian: L('Italian', 'Italiano', `
      il lo la i gli le un una di che e a in è non si per con come ma più questo quello io tu lui lei noi voi loro molto anche già solo o quando dove chi perché casa giorno notte tempo anno vita uomo donna bambino amico famiglia lavoro scuola città paese mondo acqua cibo libro parola lingua musica gioco aiuto grazie prego scusa amore buono cattivo nuovo vecchio grande piccolo veloce lento bello brutto caldo freddo mattina sera oggi ieri domani sempre mai qui lì adesso dopo prima meglio meno poco niente qualcosa essere avere fare andare vedere sapere potere volere`),

    dutch: L('Dutch', 'Nederlands', `
      de het een en van in is dat op te zijn voor met niet aan er maar om hij zij wij jullie ze ik jij je dit die ook als dan nog wel zo veel weinig goed slecht nieuw oud groot klein snel langzaam mooi warm koud dag nacht tijd jaar leven man vrouw kind vriend familie werk school stad land wereld water eten boek woord taal muziek spel hulp dank alsjeblieft sorry liefde ochtend avond vandaag gisteren morgen altijd nooit hier daar nu later eerder beter minder niets iets hebben doen gaan zien weten kunnen willen`),

    indonesian: L('Indonesian', 'Bahasa Indonesia', `
      yang dan di ke dari untuk dengan pada dalam ini itu adalah tidak ada akan saya kamu dia kami kita mereka atau tetapi juga sudah belum bisa harus mau apa siapa mana kapan mengapa bagaimana semua banyak sedikit besar kecil baik buruk baru lama cantik cepat lambat panas dingin hari malam pagi siang sore minggu bulan tahun waktu sekarang besok kemarin rumah sekolah kerja teman keluarga ibu ayah kakak adik anak orang kota jalan mobil air makanan nasi ikan sayur buah buku surat kata bahasa musik permainan bantuan terima kasih tolong maaf cinta hidup dunia harapan`),

    swedish: L('Swedish', 'Svenska', `
      och i att det som en på är av för med till den har de inte om ett men var jag du han hon vi ni dom från så eller när hur vad vem varför vara ha göra gå se veta kunna vilja dag natt tid år liv man kvinna barn vän familj arbete skola stad land värld vatten mat bok ord språk musik spel hjälp tack snälla förlåt kärlek bra dålig ny gammal stor liten snabb långsam vacker varm kall morgon kväll idag igår imorgon alltid aldrig här där nu sedan förut bättre mindre mycket lite inget något`),

    norwegian: L('Norwegian', 'Norsk', `
      og i det er som en på av for med til den har de ikke om et men var jeg du han hun vi dere fra så eller når hvordan hva hvem hvorfor være ha gjøre gå se vite kunne ville dag natt tid år liv mann kvinne barn venn familie arbeid skole by land verden vann mat bok ord språk musikk spill hjelp takk vennligst unnskyld kjærlighet god dårlig ny gammel stor liten rask sakte pen varm kald morgen kveld alltid aldri her der nå senere før bedre mindre mye lite ingenting noe`),

    danish: L('Danish', 'Dansk', `
      og i at det er en på af for med til den har de ikke om et men var jeg du han hun vi fra så eller når hvordan hvad hvem hvorfor være have gøre gå se vide kunne ville dag nat tid år liv mand kvinde barn ven familie arbejde skole by land verden vand mad bog ord sprog musik spil hjælp tak undskyld kærlighed god dårlig ny gammel stor lille hurtig langsom smuk varm kold morgen aften altid aldrig her der nu senere før bedre mindre meget lidt intet noget`),

    finnish: L('Finnish', 'Suomi', `
      ja on ei että se hän me te he minä sinä tämä tuo mikä kuka missä milloin miksi miten kaikki paljon vähän iso pieni hyvä huono uusi vanha kaunis nopea hidas kuuma kylmä päivä yö aamu ilta viikko kuukausi vuosi aika nyt huomenna eilen koti koulu työ ystävä perhe äiti isä veli sisko lapsi poika tyttö mies nainen ihminen kaupunki maa maailma tie auto vesi ruoka kala vihannes hedelmä kirja kirje sana kieli musiikki peli apu kiitos anteeksi rakkaus elämä toivo olla tehdä mennä tulla nähdä tietää voida haluta`),

    polish: L('Polish', 'Polski', `
      i w nie na się z do to że jest jak ale po co tak za od czy już tylko przez dla ten ta te ja ty on ona my wy oni być mieć robić iść widzieć wiedzieć móc chcieć dzień noc czas rok życie człowiek mężczyzna kobieta dziecko przyjaciel rodzina praca szkoła miasto kraj świat woda jedzenie książka słowo język muzyka gra pomoc dziękuję proszę przepraszam miłość dobry zły nowy stary duży mały szybki wolny piękny gorący zimny rano wieczór dzisiaj wczoraj jutro zawsze nigdy tutaj tam teraz potem wcześniej lepiej mniej dużo mało nic coś`),

    czech: L('Czech', 'Čeština', `
      a v je se na to že s z do i ne jako ale by si od za jak už pro tak co když jen jeho byl ten ta já ty on ona my vy oni být mít dělat jít vidět vědět moci chtít den noc čas rok život člověk muž žena dítě přítel rodina práce škola město země svět voda jídlo kniha slovo jazyk hudba hra pomoc děkuji prosím promiňte láska dobrý špatný nový starý velký malý rychlý pomalý krásný horký studený ráno večer dnes včera zítra vždy nikdy tady tam teď potom dříve lépe méně mnoho málo nic něco`),

    romanian: L('Romanian', 'Română', `
      și în de la a cu pe nu este un o că se pentru care mai dar ce să sau eu tu el ea noi voi ei ele fi avea face merge vedea ști putea vrea zi noapte timp an viață om bărbat femeie copil prieten familie muncă școală oraș țară lume apă mâncare carte cuvânt limbă muzică joc ajutor mulțumesc iertare dragoste bun rău nou vechi mare mic rapid lent frumos cald rece dimineață seară azi ieri mâine mereu niciodată aici acolo acum apoi înainte bine puțin mult nimic ceva`),

    turkish: L('Turkish', 'Türkçe', `
      ve bir bu da de için ile ama çok daha en gibi ben sen o biz siz onlar var yok evet hayır ne kim nerede neden nasıl hepsi az büyük küçük iyi kötü yeni eski güzel hızlı yavaş sıcak soğuk gün gece sabah akşam hafta ay yıl zaman şimdi yarın dün ev okul iş arkadaş aile anne baba kardeş çocuk erkek kadın insan şehir ülke dünya su yemek balık sebze meyve kitap mektup kelime dil müzik oyun yardım teşekkürler lütfen özür aşk hayat umut olmak yapmak gitmek gelmek görmek bilmek istemek`),

    russian: L('Russian', 'Русский', `
      и в не на я он с что а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или быть мой день ночь время год жизнь человек мужчина женщина ребенок друг семья работа школа город страна мир вода еда книга слово язык музыка игра помощь спасибо пожалуйста прости любовь хороший плохой новый старый большой маленький быстрый медленный красивый горячий холодный утро вечер сегодня вчера завтра всегда никогда здесь там сейчас потом раньше лучше меньше много мало ничего`),

    greek: L('Greek', 'Ελληνικά', `
      και το να η ο της του των σε με για από που δεν είναι ένα μια αυτό αυτός αυτή εγώ εσύ εμείς εσείς αυτοί ότι πως τι ποιος πού πότε γιατί όλα πολύ λίγο μεγάλο μικρό καλό κακό νέο παλιό όμορφο γρήγορο αργό ζεστό κρύο μέρα νύχτα πρωί βράδυ εβδομάδα μήνας χρόνος ώρα τώρα αύριο χθες σπίτι σχολείο δουλειά φίλος οικογένεια μητέρα πατέρας παιδί άντρας γυναίκα άνθρωπος πόλη χώρα κόσμος νερό φαγητό βιβλίο λέξη γλώσσα μουσική παιχνίδι βοήθεια ευχαριστώ παρακαλώ συγγνώμη αγάπη ζωή ελπίδα`)
  };
})();
