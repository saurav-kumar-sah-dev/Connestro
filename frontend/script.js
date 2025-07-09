const token = localStorage.getItem("token");

if (!token && !window.location.href.includes("login") && !window.location.href.includes("signup")) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(localStorage.getItem("user"));

// 🔴 Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});


// ✅ FEED PAGE (index.html)
if (window.location.pathname.includes("index.html")) {
  document.getElementById("postForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = document.getElementById("content").value;

    const res = await fetch("http://localhost:5000/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      document.getElementById("content").value = "";
      loadPosts();
    } else {
      alert("Post failed");
    }
  });

  async function loadPosts() {
    const res = await fetch("http://localhost:5000/api/posts", {
      headers: { Authorization: token },
    });

    const posts = await res.json();
    const container = document.getElementById("posts");
    container.innerHTML = "";

    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <h3><a href="profile.html?id=${post.user._id}">@${post.user.username}</a></h3>
        <p>${post.content}</p>
        <small>${new Date(post.createdAt).toLocaleString()}</small>
        <button onclick="likePost('${post._id}')">❤️ ${post.likes.length}</button>
      `;
      container.appendChild(div);
    });
  }

  window.likePost = async function (id) {
    await fetch(`http://localhost:5000/api/posts/like/${id}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    loadPosts();
  };

  loadPosts();
}


// ✅ PROFILE PAGE (profile.html)
if (window.location.pathname.includes("profile.html")) {
  const urlParams = new URLSearchParams(window.location.search);
  const profileUserId = urlParams.get("id") || currentUser.id;

  async function loadProfile() {
    const res = await fetch(`http://localhost:5000/api/users/${profileUserId}`, {
      headers: { Authorization: token },
    });
    const user = await res.json();

    document.getElementById("profileUsername").innerText = "@" + user.username;
    document.getElementById("followersCount").innerText = user.followers.length;
    document.getElementById("followingCount").innerText = user.following.length;

    const followBtn = document.getElementById("followBtn");
    const unfollowBtn = document.getElementById("unfollowBtn");

    if (user._id !== currentUser.id) {
      const isFollowing = user.followers.includes(currentUser.id);
      followBtn.style.display = isFollowing ? "none" : "inline-block";
      unfollowBtn.style.display = isFollowing ? "inline-block" : "none";
    } else {
      followBtn.style.display = "none";
      unfollowBtn.style.display = "none";
    }

    loadUserPosts(user._id);
  }

  async function loadUserPosts(userId) {
    const res = await fetch("http://localhost:5000/api/posts", {
      headers: { Authorization: token },
    });

    const allPosts = await res.json();
    const posts = allPosts.filter(post => post.user._id === userId);

    const container = document.getElementById("userPosts");
    container.innerHTML = "";

    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <p>${post.content}</p>
        <small>${new Date(post.createdAt).toLocaleString()}</small>
        <button onclick="likePost('${post._id}')">❤️ ${post.likes.length}</button>
      `;
      container.appendChild(div);
    });
  }

  window.likePost = async function (id) {
    await fetch(`http://localhost:5000/api/posts/like/${id}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    loadUserPosts(profileUserId);
  };

  document.getElementById("followBtn")?.addEventListener("click", async () => {
    await fetch(`http://localhost:5000/api/users/follow/${profileUserId}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    loadProfile();
  });

  document.getElementById("unfollowBtn")?.addEventListener("click", async () => {
    await fetch(`http://localhost:5000/api/users/unfollow/${profileUserId}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    loadProfile();
  });

  loadProfile();
}
