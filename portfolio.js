const projects = [
  {slug:'dom-przyjec-gonsior',name:'Dom Przyjęć Gonsior',category:'hospitality',label:'STRONA INTERNETOWA',location:'Wodzisław Śląski',image:'/showcases/gonsior/assets/official-sala.webp',preview:'/showcases/gonsior/',theme:'gonsior',headline:'Dobre miejsce.<br>Dobra historia.',summary:'Serwis dla domu przyjęć, który łączy atmosferę miejsca z czytelną prezentacją uroczystości i prostą drogą do zapytania.',scope:'Projekt i frontend',duration:'Do potwierdzenia',tags:['Projekt interfejsu','Responsywność','Formularz zapytania'],chapters:[['Miejsce gra pierwsze skrzypce.','Duże fotografie, spokojna typografia i opowieść o przestrzeni. Strona pokazuje salę i charakter uroczystości, zanim odwiedzający przejdzie do szczegółów.'],['Oferta, która prowadzi dalej.','Podział według okazji, prezentacja kuchni oraz wyraźne przejścia do kontaktu pomagają odnaleźć właściwy wariant przyjęcia.'],['Od zainteresowania do rozmowy.','Interfejs zapytania porządkuje termin, zakres wydarzenia i dane kontaktowe. Integracja wysyłki pozostaje osobnym etapem wdrożenia.']]},
  {slug:'dom-przyjec-premium',name:'Dom Przyjęć PREMIUM',category:'hospitality',label:'STRONA INTERNETOWA',location:'Radlin',image:'/showcases/premium/assets/stoly.jpg',preview:'/showcases/premium/',theme:'premium',headline:'Ważne chwile.<br>Własna oprawa.',summary:'Strona dla domu przyjęć w Radlinie. Elegancka prezentacja przestrzeni i oferty, z naciskiem na organizację wydarzenia od pierwszego kontaktu.',scope:'Projekt i frontend',duration:'Do potwierdzenia',tags:['Kierunek wizualny','Oferta przyjęć','Wersja mobilna'],chapters:[['Charakter od pierwszego ekranu.','Wyrazista kompozycja, duże zdjęcia i ciepłe kolory budują oprawę odpowiednią dla wesel, spotkań rodzinnych i wydarzeń firmowych.'],['Złożona oferta w prostym układzie.','Najważniejsze okazje, przestrzenie i informacje o organizacji spotkania zebraliśmy w uporządkowane sekcje.'],['Kontakt na każdym urządzeniu.','Responsywny układ i widoczne przyciski kontaktowe pozwalają wygodnie rozpocząć rozmowę również z telefonu.']]}
];

function el(tag, className, text) {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function card(project){
  const link=el('a','project-card reveal');link.href='/projekt?slug='+encodeURIComponent(project.slug);
  const art=el('div','project-art '+project.theme);const img=el('img');img.src=project.image;img.alt='Wnętrze '+project.name;img.loading='lazy';art.append(img,el('span','project-label',project.label));
  const caption=el('span','art-caption');caption.innerHTML=project.headline;art.append(caption);
  const meta=el('div','project-meta'),copy=el('div');copy.append(el('h2','',project.name),el('p','',project.location+' · Projekt strony'));const arrow=el('span','open-arrow','↗');arrow.setAttribute('aria-hidden','true');meta.append(copy,arrow);link.append(art,meta);return link;
}
function setupReveal(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.documentElement.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(node=>observer.observe(node));
}
const grid=document.getElementById('projectGrid');
if(grid){
  document.querySelector('.small-label').textContent=projects.length+' PROJEKTY ↓';
  let filter='all';const input=document.getElementById('projectSearch');
  const render=()=>{const query=input.value.toLocaleLowerCase('pl');const selected=projects.filter(p=>(filter==='all'||p.category===filter)&&(p.name+' '+p.location+' '+p.tags.join(' ')).toLocaleLowerCase('pl').includes(query));grid.replaceChildren(...selected.map(card));document.getElementById('emptyProjects').hidden=selected.length>0;setupReveal();};
  document.querySelectorAll('[data-filter]').forEach(button=>{button.setAttribute('aria-pressed',String(button.classList.contains('active')));button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();});});input.addEventListener('input',render);render();
}
const study=document.getElementById('caseStudy');
if(study){
  const project=projects.find(p=>p.slug===new URLSearchParams(location.search).get('slug'));
  if(!project){const intro=el('section','intro');intro.append(el('h1','','Nie znaleziono projektu.'));const back=el('a','pill','Wróć do projektów ↗');back.href='/projekty';intro.append(back);study.append(intro);}else{
    document.title=project.name+' — realizacja STFS';
    const intro=el('section','case-intro');intro.append(el('p','eyebrow','WYBRANA REALIZACJA / '+project.location.toUpperCase()),el('h1','',project.name),el('p','case-lead',project.summary));
    const facts=el('dl','case-facts');[['Dla kogo',project.name],['Zakres',project.scope],['Czas realizacji',project.duration],['Status','Podgląd projektu']].forEach(([label,value])=>{const pair=el('div');pair.append(el('dt','',label),el('dd','',value));facts.append(pair);});intro.append(facts);study.append(intro);
    const lead=el('div','walkthrough-lead');lead.append(el('p','eyebrow','PRZEWIŃ. ZOBACZ. POZNAJ HISTORIĘ.'),el('h2','','Za każdym fragmentem stoi pomysł.'),el('p','','Przewijaj w dół — odkrywaj stronę i decyzje, które nadały jej charakter.'));study.append(lead);
    const walkthrough=el('section','walkthrough'),preview=el('div','walkthrough-browser'),bar=el('div','browser-bar');bar.append(el('span','browser-dots','● ● ●'),el('span','','REALIZACJA / WIDOK DESKTOPOWY'));const open=el('a','','Otwórz stronę ↗');open.href=project.preview;open.target='_blank';open.rel='noopener';bar.append(open);
    const stage=el('div','project-canvas'),frame=el('iframe');frame.src=project.preview;frame.title='Pełny podgląd: '+project.name;frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('scrolling','no');frame.setAttribute('tabindex','-1');frame.width='1440';frame.height='900';stage.append(frame);preview.append(bar,stage);walkthrough.append(preview);
    const notes=project.theme==='premium'?[
      ['top','PIERWSZE WRAŻENIE','Dobre chwile zaczynają się od dobrego projektu.','Wielkie zdjęcie, ciepłe kolory i jedno zdanie, które oddaje charakter PREMIUM. Od pierwszego ekranu wiadomo, dokąd trafiliśmy.'],
      ['miejsce','ZA KULISAMI','Zanim powstała strona, zadaliśmy właściwe pytania.','Co jest ważne dla gospodarzy? Co chcą zobaczyć goście? Z analizy miejsca i potrzeb powstał układ, który opowiada o atmosferze, a nie tylko o metrach sali.'],
      ['okazje','LUDZIE I EMOCJE','Za tym miejscem kryją się wspomnienia i uśmiechy.','Wesele, jubileusz, rodzinny obiad — różne historie potrzebują własnej oprawy. Dlatego każda okazja ma tutaj swoje miejsce i czytelną drogę do oferty.'],
      ['catering-showcase','APETYT NA WIĘCEJ','Najpierw jemy oczami. Także na stronie.','Duże kadry i spokojna kompozycja oddają głos kuchni. Oferta cateringu pojawia się dokładnie wtedy, gdy odwiedzający chce wiedzieć więcej.'],
      ['kontakt','OD WRAŻENIA DO ROZMOWY','Dobry projekt pomaga zrobić kolejny krok.','Na końcu historii jest człowiek. Telefon, e-mail i adres są pod ręką — aby zainteresowanie łatwo zamieniło się w rozmowę.']
    ]:[
      ['top','PIERWSZE WRAŻENIE','Gościnność, którą widać od pierwszego ekranu.','Światło, ogród i fotografia miejsca budują pierwsze wrażenie. Projekt nadaje oprawę temu, co goście zobaczą na żywo.'],
      ['miejsce','ZA KULISAMI','Najpierw poznajemy miejsce. Potem je projektujemy.','Analiza oferty, charakteru sali i pytań gospodarzy pomaga zdecydować, co pokazać najpierw i jak poprowadzić odwiedzającego.'],
      ['oferta','WSPÓLNE CHWILE','Każda uroczystość ma swoją historię.','Wesela i rodzinne spotkania łączy potrzeba dobrego miejsca. Wyraźny podział oferty pomaga znaleźć własny powód do świętowania.'],
      ['catering','APETYT NA WIĘCEJ','Kuchnia też zasługuje na własną opowieść.','Zdjęcia, szczegóły oferty i krótkie opisy pokazują, co może trafić na stół. Bez nadmiaru informacji.'],
      ['kontakt','KOLEJNY KROK','Od dobrego wrażenia do pierwszej rozmowy.','Kontakt wieńczy prezentację i pozwala przejść od oglądania miejsca do planowania własnej uroczystości.']
    ];
    const annotations=notes.map(([anchor,kicker,title,text],index)=>{const note=el('article','project-annotation '+(index%2?'annotation--right':'annotation--left'));note.dataset.anchor=anchor;const line=el('span','annotation-line');line.setAttribute('aria-hidden','true');const body=el('div','annotation-body');body.append(el('span','eyebrow',kicker),el('h3','',title),el('p','',text));note.append(line,body);walkthrough.append(note);return note;});
    if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      walkthrough.classList.add('annotations-animated');
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('visible',entry.isIntersecting)),{rootMargin:'-12% 0px -16% 0px',threshold:0});
      annotations.forEach(note=>observer.observe(note));
    }
    study.append(walkthrough);let layout=null;
    const resize=()=>{const scale=stage.clientWidth/1440;if(!layout)return;frame.style.width='1440px';frame.style.height=layout.height+'px';frame.style.transform=`scale(${scale})`;stage.style.height=(layout.height*scale)+'px';annotations.forEach(note=>{const section=layout.sections[note.dataset.anchor];if(section)note.style.top=(bar.offsetHeight+(section.y+Math.min(section.height*.22,210))*scale)+'px';});};
    window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='stfs-showcase-layout')return;const data=event.data;if(!Number.isFinite(data.height)||data.height<100||data.height>60000||!data.sections||typeof data.sections!=='object')return;layout={height:data.height,sections:{}};for(const [key,section] of Object.entries(data.sections)){if(Number.isFinite(section.y)&&Number.isFinite(section.height)&&section.y>=0&&section.y<60000&&section.height>=0)layout.sections[key]=section;}resize();});new ResizeObserver(resize).observe(stage);
    const closing=el('section','closing');closing.append(el('span','eyebrow','TWÓJ PROJEKT. TWÓJ CHARAKTER.'),el('h2','','Stwórzmy coś, co pasuje do Twojej firmy.'));const cta=el('a','pill','Porozmawiajmy ↗');cta.href='/#konsultacja';closing.append(cta);study.append(closing);setupReveal();
  }
}
const reviewsGrid=document.getElementById('reviews');
if(reviewsGrid){
  const status=document.getElementById('reviewStatus');
  const safeGoogleUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(['google.com','google.pl','maps.app.goo.gl','goo.gl','share.google'].includes(url.hostname)||/\.(?:google\.com|google\.pl)$/.test(url.hostname))?url.href:null;}catch{return null;}};
  const empty=(title,text)=>{const box=el('div','review-empty');box.append(el('h3','',title),el('p','',text));reviewsGrid.replaceChildren(box);};
  (async()=>{try{
    const response=await fetch('/api/reviews',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('fetch');const data=await response.json();
    if(data.demo){const banner=el('div','review-empty');banner.setAttribute('role','note');banner.append(el('h3','','Podgląd testowy'),el('p','','Opinie z przykładowej wizytówki. Nie dotyczą STFS AI STUDIO.'));document.querySelector('.reviews-panel').before(banner);}
    const source=safeGoogleUrl(data.profileUrl);if(source){const link=document.getElementById('reviewSource');link.href=source;link.hidden=false;}
    if(data.status==='unconfigured'){status.textContent='Profil Google nie jest jeszcze podłączony.';empty('Tu pojawią się opinie.','Po podłączeniu profilu firmy zobaczysz tutaj aktualne wypowiedzi klientów z Google.');return;}
    if(!Array.isArray(data.reviews)||!data.reviews.length){status.textContent='Opinie są chwilowo niedostępne.';empty('Jeszcze chwila.','Nie udało się pobrać opinii. Spróbuj później lub sprawdź profil bezpośrednio w Google.');return;}
    if(Number.isFinite(data.rating)){const rating=el('p','stars',data.rating.toFixed(1)+' / 5');document.getElementById('reviewSummary').prepend(rating);}
    if(Number.isInteger(data.count)&&data.count>=0){document.getElementById('reviewSummary').append(el('p','',data.count+' opinii w Google'));}
    const updated=data.updatedAt?new Date(data.updatedAt):null;status.textContent=(data.status==='stale'?'Wyświetlamy ostatnio pobrane opinie. ':'')+(updated&&!Number.isNaN(updated.getTime())?'Aktualizacja: '+updated.toLocaleString('pl-PL'):'Opinie z Google');
    reviewsGrid.replaceChildren(...data.reviews.map(review=>{const article=el('article','review-card');const author=el('div','review-author');author.append(el('span','avatar',String(review.author||'K').slice(0,1)),el('span','',review.author||'Klient Google'));const rating=Math.max(0,Math.min(5,Number(review.rating)||0));const stars=el('p','stars','★'.repeat(Math.round(rating)));stars.setAttribute('aria-label',rating+' na 5');article.append(author,stars,el('p','',review.text||''),el('span','',review.date||''));const url=safeGoogleUrl(review.url)||source;if(url){const link=el('a','','Czytaj w Google ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';article.append(el('br'),link);}return article;}));
  }catch{status.textContent='Nie udało się połączyć z opiniami.';empty('Opinie wrócą za chwilę.','Odśwież stronę za moment.');}finally{reviewsGrid.setAttribute('aria-busy','false');}})();
}
