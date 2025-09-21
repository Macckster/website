  const starsContainer = document.querySelector('.stars');
  const stars = [];
  const starCount = 200;

  // Create stars with random positions and velocities
  for(let i=0;i<starCount;i++){
    const star = document.createElement('span');
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const vx = (Math.random() - 0.5) * 0.2; // horizontal speed
    const vy = (Math.random() - 0.5) * 0.2; // vertical speed
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    star.style.width = star.style.height = (1 + Math.random()*2) + 'px';
    starsContainer.appendChild(star);
    stars.push({el: star, x, y, vx, vy});
  }

  // Animate star movement
  function animateStars() {
    for(const s of stars){
      s.x += s.vx;
      s.y += s.vy;

      // Wrap around edges
      if(s.x < 0) s.x = window.innerWidth;
      if(s.x > window.innerWidth) s.x = 0;
      if(s.y < 0) s.y = window.innerHeight;
      if(s.y > window.innerHeight) s.y = 0;

      s.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
    requestAnimationFrame(animateStars);
  }
  animateStars();

  function warp(){
    const rocket=document.getElementById('rocket');

    // Stop floating, shake rocket
    rocket.style.animation="shake 0.6s ease-in-out";

    // After shake, launch
    setTimeout(()=>{
      rocket.style.animation="launch 1s ease-in forwards";
      starsContainer.classList.add('warp');
    },600);

    // Redirect after warp
    setTimeout(()=>{
      const destinations=[
        "https://www.reddit.com",
        "https://duckduckgo.com",
        "https://news.ycombinator.com",
        "https://xkcd.com",
        "https://wikipedia.org",
		"https://www.torproject.org/"
      ];
      const randomSite=destinations[Math.floor(Math.random()*destinations.length)];
      window.location.href=randomSite;
    },1800);
  }

  // Adjust star positions on resize
  window.addEventListener('resize', () => {
    for(const s of stars){
      s.x = Math.random()*window.innerWidth;
      s.y = Math.random()*window.innerHeight;
    }
  });