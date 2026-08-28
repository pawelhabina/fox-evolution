export const HELP_SECTIONS = [
  {
    id: 'start',
    title: 'Pierwsze kroki',
    icon: 'play',
    summary: 'Kupuj lisy, łącz identyczne osobniki i rozwijaj coraz szybszą ekonomię.',
    tips: [
      ['Kupowanie', 'Przycisk zakupu dodaje lisa na planszę. Cena kolejnych zakupów rośnie w bieżącym cyklu.'],
      ['Łączenie', 'Przeciągnij lisa na drugiego lisa o tym samym tierze. Dwa identyczne lisy zmienią się w jednego lisa wyższego tieru.'],
      ['Blokada lisa', 'W menu pod prawym przyciskiem możesz zablokować lisa przed przypadkowym połączeniem. Podczas przeciągania zgodne żywioły są podświetlane, a poprawny cel merge zmienia kolor.'],
      ['Klikanie', 'Kliknięcie lisa natychmiast dodaje monety. Wartość kliknięcia rośnie wraz z tierem i ulepszeniami.'],
      ['Menu lisa', 'Kliknij lisa prawym przyciskiem, aby sprawdzić jego parametry, sprzedać go lub rozpocząć dostępną ewolucję.'],
      ['Miejsce na planszy', 'Gdy osiągniesz limit lisów, połącz lub sprzedaj część kolekcji albo kup trwałe rozszerzenie limitu za Rebirth points.']
    ],
    callout: 'Najlepszy początek: kupuj lisy, regularnie łącz duplikaty i najpierw wzmacniaj pasywny income.'
  },
  {
    id: 'economy',
    title: 'Ekonomia i sklep',
    icon: 'coin',
    summary: 'Monety napędzają bieżący cykl, diamenty dają specjalne bonusy, a Rebirth points zapewniają trwały rozwój.',
    tips: [
      ['Pasywny income', 'Każdy lis wypłaca monety przy globalnym ticku. Zarobki są liczone z rzeczywistego czasu także po zminimalizowaniu okna i po powrocie do gry.'],
      ['Monety', 'Wydawaj je na lisy oraz ulepszenia bieżącej rozgrywki: income, kliknięcia, rabat i wyższy tier zakupów.'],
      ['Diamenty', 'Wypadają podczas pasywnego zarabiania oraz pochodzą z zadań i nagród logowania. Służą do ewolucji, boostów i ulepszeń premium.'],
      ['Rebirth points', 'Kupują trwałe ulepszenia, między innymi limit lisów, szybkość ticka i szansę zakupu wyższego tieru.'],
      ['Boosty czasowe', 'Turbo Tick, Złoty Deszcz, Furia Kliku i Kupiecki Kupon działają przez wybrany czas. Aktywuj je wtedy, gdy planujesz intensywnie grać.'],
      ['Instant Cash', 'Natychmiast dodaje równowartość określonego czasu aktualnego income. Najwięcej zyskasz po wcześniejszym rozwinięciu planszy.']
    ],
    callout: 'Nie wydawaj wszystkich diamentów od razu — Mega Fox potrzebuje 2 diamentów do ewolucji.'
  },
  {
    id: 'evolution',
    title: 'Ewolucje żywiołów',
    icon: 'upgrade',
    summary: 'Mega Fox z tieru 15 może wejść na jedną z trzech ścieżek i rozwijać się aż do tieru 30.',
    tips: [
      ['Jak ewoluować', 'Otwórz prawym przyciskiem menu zwykłego Mega Foxa na tierze 15 i wybierz żywioł. Ewolucja kosztuje 2 diamenty.'],
      ['Fire Fox', 'Zapewnia +50% wartości kliknięcia. To dobry wybór dla aktywnego stylu gry.'],
      ['Electric Fox', 'Zapewnia +50% własnego pasywnego income. Pomaga szybciej rozbudowywać ekonomię.'],
      ['Water Fox', 'Wzmacnia najbliższego lisa o 50%. Pozycja lisa na planszy ma znaczenie.'],
      ['Dalsze łączenie', 'Łączyć można dwa lisy tego samego tieru i tego samego żywiołu. Elementalne lisy rozwijają się do tieru 30.'],
      ['Różne żywioły', 'Zwykle lisów różnych żywiołów nie można połączyć. Wyjątkiem jest drużyna Ogień, Prąd i Woda na poziomie 20, która otwiera próbę Hydry.'],
      ['Walka z Hydrą', 'Wpisuj wyłącznie na klawiaturze wskazane litery, zanim skończy się widoczny czas. Szybkie reakcje budują combo, a pomyłki mocno ranią drużynę. Po porażce kolejna próba jest dostępna za godzinę.'],
      ['Oswojona Hydra', 'Po zwycięstwie trzy lisy znikają, a na planszy pojawia się Hydra Lv 1 łącząca dochód Prądu, klik Ognia i aurę Wody. Dwie Hydry tego samego poziomu łączą się aż do Lv 5.']
    ],
    callout: 'Wodnego lisa ustaw blisko najsilniejszego źródła income, aby jego aura trafiała we właściwy cel.'
  },
  {
    id: 'mine',
    title: 'Kopalnia Duchów',
    icon: 'diamond',
    summary: 'Po pierwszej Hydrze odblokujesz Esencję i podziemne królestwo z maksymalnie 10 automatycznymi kopalniami.',
    tips: [
      ['Odblokowanie', 'Pokonaj Hydrę po połączeniu trzech żywiołowych lisów na poziomie 20. Otrzymasz pierwsze 25 Esencji Hydry.'],
      ['Mapa kopalń', 'Kraina jest mapą maksymalnie 10 osobnych kopalni. Kliknij „Wejdź do kopalni”, aby otworzyć jej szyb, windę, magazyn i pracowników.'],
      ['Pierwsza kopalnia', 'Na początku działa tylko Kopalnia Ognia. Wytwarza Ogniste monety, którymi rozwiniesz szyb i odblokujesz Kopalnię Prądu.'],
      ['Kolejne kopalnie', 'Kopalnie odblokowują się w kolejności Ogień → Prąd → Woda. Koszt nowej kopalni płacisz monetami poprzedniego żywiołu. Możesz zbudować ich łącznie 10.'],
      ['Trzy waluty', 'Każdy żywioł ma własne monety. Ogniste, Elektryczne i Wodne monety ulepszają wyłącznie kopalnie odpowiadającego im typu.'],
      ['Odbieranie', 'W konkretnej kopalni odbierzesz tylko jej urobek. Na mapie przycisk „Odbierz ze wszystkich” opróżnia wszystkie magazyny naraz.'],
      ['Górnicy i poziomy', 'Pogłębianie kopalni i zatrudnianie kolejnych lisów zwiększa jej tempo produkcji. Głębsze pokoje dostają dodatkowy bonus.'],
      ['Winda i magazyn', 'Każda kopalnia ma własną, widoczną windę oraz własny magazyn. Winda kursuje między szybem a magazynem i zwiększa produkcję, a magazyn podnosi limit urobku. Oba ulepszasz osobno za Esencję Hydry.'],
      ['Minimalizacja', 'Gra rozlicza upływ rzeczywistego czasu. Zminimalizowane okno nie zatrzymuje planszy ani kopalni.']
    ],
    callout: 'Odbieraj urobek przed zapełnieniem kopalni — pełny magazyn zatrzymuje produkcję danego pokoju.'
  },
  {
    id: 'rebirth',
    title: 'Rebirth',
    icon: 'rebirth',
    summary: 'Resetuje bieżącą ekonomię w zamian za punkty, które przyspieszają wszystkie kolejne cykle.',
    tips: [
      ['Kiedy jest dostępny', 'Punkty otrzymujesz za lisy od tieru 15 wzwyż. Im wyższy tier, tym szybciej rośnie nagroda.'],
      ['Co zostaje', 'Zachowujesz diamenty, Esencję, trzy waluty żywiołów, Hydrę, Kopalnię Duchów, dotychczasowe Rebirth points, trwałe ulepszenia, ustawienia, statystyki, zadania i odkrycia Pokédexu.'],
      ['Co się resetuje', 'Zwykłe i żywiołowe lisy poza Hydrą, monety, licznik zakupów oraz ulepszenia kupowane za monety wracają do stanu początkowego.'],
      ['Limit lisów', 'Ulepszenie limitu kupione za Rebirth points pozostaje po resecie i pozwala budować większą planszę w przyszłości.'],
      ['Koszty ulepszeń', 'Każdy kolejny poziom ulepszenia w sklepie Rebirth kosztuje dwa razy więcej niż poprzedni.'],
      ['Dobry moment', 'Wykonaj Rebirth, gdy nowy trwały zakup wyraźnie przyspieszy następny cykl lub obecny rozwój mocno zwolnił.']
    ],
    callout: 'Przed zatwierdzeniem gra pokazuje dokładną liczbę zdobywanych punktów i prosi o potwierdzenie.'
  },
  {
    id: 'goals',
    title: 'Zadania i kolekcja',
    icon: 'quest',
    summary: 'Codzienne cele, nagrody logowania i Pokédex zapewniają dodatkowe kierunki rozwoju.',
    tips: [
      ['Zadania dzienne', 'Wykonuj wskazane zakupy, kliknięcia i merge, a następnie ręcznie odbieraj nagrody przed resetem.'],
      ['Zadania tygodniowe', 'Mają większe wymagania i nagrody. Postęp oraz czas do resetu znajdziesz w zakładce Zadania.'],
      ['Nagrody logowania', 'Odbieraj dzienny bonus diamentów. Regularne odbiory budują serię i przybliżają bonus miesięczny.'],
      ['Pokédex', 'Pierwsze zdobycie danego tieru lub wariantu żywiołowego zapisuje odkrycie na stałe. Pokédex zawiera 63 wpisy.'],
      ['Statystyki', 'Ekran statystyk pokazuje aktywny czas gry, zarobki, wydatki, merge, odkrycia i rekordy konkretnego save’a.']
    ],
    callout: 'Samo ukończenie zadania nie wypłaca diamentów — pamiętaj nacisnąć „Odbierz”.'
  },
  {
    id: 'saves',
    title: 'Zapisy i konto',
    icon: 'folder',
    summary: 'Możesz prowadzić kilka osobnych rozgrywek lokalnie albo przypisać je do konta.',
    tips: [
      ['Autosave', 'Gra zapisuje postęp automatycznie co kilka sekund. Przy wyjściu do menu wykonywany jest dodatkowy zapis.'],
      ['Kilka save’ów', 'Każdy slot ma własną planszę, waluty, statystyki i Pokédex. Statystyki save’a można podejrzeć bez rozpoczynania gry.'],
      ['Gra jako gość', 'Nie wymaga konta, ale zapis pozostaje na danym urządzeniu. Utrata danych urządzenia może oznaczać utratę postępu.'],
      ['Konto gracza', 'Po zalogowaniu zapisy są przypisane do konta i mogą być pobierane po ponownym uruchomieniu gry.'],
      ['Zmiana urządzenia', 'Zaloguj się na to samo konto i poczekaj na wczytanie listy zapisów przed utworzeniem nowej gry.']
    ],
    callout: 'Nie wyłączaj aplikacji podczas komunikatu o zapisywaniu lub instalowania aktualizacji.'
  },
  {
    id: 'problems',
    title: 'Problemy i bezpieczeństwo',
    icon: 'settings',
    summary: 'Najczęstsze problemy można rozwiązać bez kasowania postępu.',
    tips: [
      ['Brak dźwięku', 'Sprawdź osobno wyciszenie muzyki i efektów oraz ich suwaki w Ustawieniach.'],
      ['Problemy z logowaniem', 'Sprawdź internet, wróć do menu głównego i spróbuj ponownie. Nie używaj twardego resetu save’a do naprawy konta.'],
      ['Nie widać zapisu', 'Upewnij się, że jesteś zalogowany na właściwe konto. Odczekaj chwilę na synchronizację i ponownie otwórz listę zapisów.'],
      ['Aktualizacja', 'Pozwól grze pobrać aktualizację w tle, a następnie użyj przycisku instalacji. Aplikacja uruchomi się ponownie.'],
      ['Twardy reset', 'Opcja w Ustawieniach usuwa postęp aktualnego save’a. Korzystaj z niej tylko świadomie — tej operacji nie można cofnąć.'],
      ['Kontakt', 'Jeśli problem wraca, zapisz wersję gry, system operacyjny i opis ostatnich czynności, a następnie napisz na kontakt@mionix.pl.']
    ],
    callout: 'Nigdy nie podawaj nikomu hasła. Administrator może wygenerować hasło tymczasowe, ale nie zna Twojego obecnego hasła.'
  }
];
