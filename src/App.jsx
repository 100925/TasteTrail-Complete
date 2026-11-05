import React, {
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";

import {
  ArrowRight,
  ChefHat,
  Clock,
  Heart,
  Search,
  Sparkles,
  Star,
  Leaf,
  Bookmark,
  X,
  Check,
  Menu,
  User,
  Plus,
  Edit3,
  Trash2
} from "lucide-react";

import { getRecipes, getCurrentUser, deleteRecipeApi } from "./api.js";
import { readSaved, writeSaved, readAuth, writeAuth } from "./storage.js";
import { filterRecipes } from "./recipe-utils.js";
import Planner from "./Planner.jsx";
import AuthModal from "./AuthModal.jsx";
import RecipeFormModal from "./RecipeFormModal.jsx";

const foodImage = (image) => {
  if (!image) return "";
  if (image.startsWith("http")) return image;

  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=85`;
};

function RecipeCard({ recipe, saved, onSave, onOpen, onPlan }) {
  return (
    <article className="recipe-card">
      <button
        className="recipe-photo"
        onClick={() => onOpen(recipe)}
        aria-label={`View ${recipe.name}`}
      >
        <img
          src={foodImage(recipe.image)}
          alt={recipe.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/food-placeholder.svg";
          }}
        />

        <span className="food-tag">
          <i
            className={
              recipe.type === "Veg"
                ? "veg-dot"
                : recipe.type === "Contains egg"
                  ? "egg-dot"
                  : "nonveg-dot"
            }
          />
          {recipe.type}
        </span>

        <span className="time-tag">
          <Clock size={14} /> {recipe.time} min
        </span>
      </button>

      <div className="recipe-info">
        <div className="recipe-meta">
          <span>{recipe.category}</span>
          <span className="rating">
            <Star size={14} fill="currentColor" /> {recipe.rating}
          </span>
        </div>

        <button
          className="recipe-title"
          onClick={() => onOpen(recipe)}
        >
          {recipe.name}
        </button>

        <p>{recipe.description}</p>

        <div className="recipe-footer">
          <span>Made for foodies</span>

          <div className="card-actions">
            <button
              className={saved ? "icon-button saved" : "icon-button"}
              onClick={() => onSave(recipe.id)}
              aria-label={`Toggle favourite for ${recipe.name}`}
              aria-pressed={saved}
              title="Add to favourites"
            >
              <Heart
                size={18}
                fill={saved ? "currentColor" : "none"}
              />
            </button>

            <button
              className="icon-button"
              onClick={() => onPlan(recipe)}
              aria-label={`Add ${recipe.name} to meal planner`}
              title="Add to meal planner"
            >
              <Bookmark size={17} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RecipeDetails({ recipe, onClose, onPlan, onEdit, onDelete, canManage }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    if (!recipe) return;

    const previous = document.activeElement;
    const bodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("button")?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const items = [
        ...dialogRef.current.querySelectorAll(
          "button:not(:disabled), input, select, [tabindex='0']"
        )
      ];

      const first = items[0];
      const last = items.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [recipe]);

  useEffect(() => {
    setStep(0);
    setChecked([]);
  }, [recipe?.id]);

  if (!recipe) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="recipe-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-heading"
      >
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>

        <img
          className="detail-image"
          src={foodImage(recipe.image)}
          alt={recipe.name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/food-placeholder.svg";
          }}
        />

        <div className="detail-content">
          <div className="recipe-meta">
            <span>{recipe.category} · {recipe.type}</span>
            <span className="rating">
              <Star size={14} fill="currentColor" /> {recipe.rating}
            </span>
          </div>

          <h2 id="recipe-heading">{recipe.name}</h2>
          <p>{recipe.description}</p>

          <div className="detail-stats">
            <span>
              <Clock size={15} /> {recipe.time} minutes
            </span>
            <span>
              <ChefHat size={15} /> {recipe.difficulty} recipe
            </span>
          </div>

          <div className="detail-columns">
            <div>
              <h3>Ingredients</h3>

              {recipe.ingredients.map((ingredient) => (
                <label className="ingredient" key={ingredient}>
                  <input
                    type="checkbox"
                    checked={checked.includes(ingredient)}
                    onChange={() =>
                      setChecked((items) =>
                        items.includes(ingredient)
                          ? items.filter(
                              (item) => item !== ingredient
                            )
                          : [...items, ingredient]
                      )
                    }
                  />
                  {ingredient}
                </label>
              ))}
            </div>

            <div>
              <h3>Let's cook!</h3>

              <div className="step-box">
                <small>
                  STEP {step + 1} / {recipe.steps.length}
                </small>
                <p>{recipe.steps[step]}</p>
              </div>

              <div className="step-actions">
                <button
                  className="outline-button"
                  disabled={step === 0}
                  onClick={() => setStep((current) => current - 1)}
                >
                  Previous
                </button>

                <button
                  className="primary-button"
                  onClick={() =>
                    setStep((current) =>
                      current === recipe.steps.length - 1
                        ? 0
                        : current + 1
                    )
                  }
                >
                  {step === recipe.steps.length - 1
                    ? "Start again"
                    : "Next step"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="owner-actions-row">
              <button
                type="button"
                className="outline-button"
                onClick={() => onEdit(recipe)}
              >
                <Edit3 size={15} /> Edit Recipe
              </button>
              <button
                type="button"
                className="remove-button"
                onClick={() => onDelete(recipe)}
              >
                <Trash2 size={15} /> Delete Recipe
              </button>
            </div>
          )}

          <button
            className="primary-button full-button"
            onClick={() => onPlan(recipe)}
          >
            <Bookmark size={16} /> Add to meal planner
          </button>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, description, onBrowse }) {
  return (
    <div className="empty-state">
      <span>🍽️</span>
      <h3>{title}</h3>
      <p>{description}</p>

      <button className="primary-button" onClick={onBrowse}>
        Explore recipes <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Footer({ goTo }) {
  return (
    <footer className="footer">
      <button className="brand" onClick={() => goTo("Home")}>
        <span className="brand-icon"><ChefHat /></span>
        <span>Taste<span className="accent">Trail</span></span>
      </button>

      <p>Made with curiosity and a little extra flavour.</p>
      <small>
        © 2026 TasteTrail · Recipe Discovery & Meal Planning
      </small>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState("Home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [sort, setSort] = useState("default");
  const [maxTime, setMaxTime] = useState("All");

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reload, setReload] = useState(0);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [toast, setToast] = useState("");

  const [favourites, setFavourites] = useState(() =>
    readSaved("tt-favourites")
  );

  const [mealPlan, setMealPlan] = useState(() =>
    readSaved("tt-meal-plan")
  );

  const [auth, setAuth] = useState(() => readAuth());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (auth.token) {
      getCurrentUser(auth.token)
        .then((verifiedUser) => {
          if (verifiedUser) {
            setAuth((curr) => ({ ...curr, user: verifiedUser }));
            writeAuth(auth.token, verifiedUser);
          } else {
            setAuth({ token: null, user: null });
            writeAuth(null, null);
          }
        })
        .catch(() => {});
    }
  }, []);

  function handleAuthSuccess(user, token) {
    setAuth({ token, user });
    writeAuth(token, user);
  }

  function handleLogout() {
    setAuth({ token: null, user: null });
    writeAuth(null, null);
    setMyRecipesOnly(false);
  }

  const [recipeFormOpen, setRecipeFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);

  function handleOpenCreateRecipe() {
    if (!auth.user) {
      setAuthModalOpen(true);
      setToast("Please sign in to add your own recipes.");
      return;
    }
    setEditingRecipe(null);
    setRecipeFormOpen(true);
  }

  function handleOpenEditRecipe(recipe) {
    setEditingRecipe(recipe);
    setRecipeFormOpen(true);
  }

  function handleRecipeSaved(savedRecipe, action) {
    if (action === "create") {
      setRecipes((prev) => [savedRecipe, ...prev]);
    } else {
      setRecipes((prev) =>
        prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
      );
      if (selectedRecipe?.id === savedRecipe.id) {
        setSelectedRecipe(savedRecipe);
      }
    }
  }

  async function handleDeleteRecipe(recipe) {
    if (!auth.token) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${recipe.name}"?`
    );
    if (!confirmed) return;

    try {
      await deleteRecipeApi(recipe.id, auth.token);
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe(null);
      }
      setToast(`Deleted "${recipe.name}"`);
    } catch (err) {
      setToast(err.message || "Failed to delete recipe");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    getRecipes(controller.signal)
      .then(({ recipes: items, offline }) => {
        setRecipes(items);
        setApiError(
          offline
            ? "Using the bundled recipe collection. The recipe server is unavailable."
            : ""
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setApiError("Recipes could not be loaded. Please retry.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!writeSaved("tt-favourites", favourites)) {
      setToast(
        "Browser storage is unavailable; changes last for this visit only."
      );
    }
  }, [favourites]);

  useEffect(() => {
    if (!writeSaved("tt-meal-plan", mealPlan)) {
      setToast(
        "Browser storage is unavailable; changes last for this visit only."
      );
    }
  }, [mealPlan]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const categories = [
    "All",
    ...new Set(recipes.map((recipe) => recipe.category))
  ];

  const filteredRecipes = useMemo(() => {
    let list = filterRecipes(recipes, {
      query,
      category,
      type,
      difficulty,
      maxTime,
      sort,
      favourites: page === "Favourites" ? favourites : null
    });
    if (myRecipesOnly && auth.user) {
      list = list.filter((r) => r.userId === auth.user.id);
    }
    return list;
  }, [
    recipes,
    page,
    favourites,
    category,
    type,
    difficulty,
    query,
    maxTime,
    sort,
    myRecipesOnly,
    auth.user
  ]);

  const filtersAreDefault =
    query === "" &&
    category === "All" &&
    type === "All" &&
    difficulty === "All" &&
    maxTime === "All" &&
    sort === "default" &&
    !myRecipesOnly;

  function resetFilters() {
    setQuery("");
    setCategory("All");
    setType("All");
    setDifficulty("All");
    setMaxTime("All");
    setSort("default");
    setMyRecipesOnly(false);
  }

  function goTo(nextPage) {
    setPage(nextPage);
    setMobileOpen(false);
    resetFilters();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function toggleFavourite(id) {
    const alreadySaved = favourites.includes(id);

    setFavourites((items) =>
      alreadySaved
        ? items.filter((item) => item !== id)
        : [...items, id]
    );

    setToast(
      alreadySaved
        ? "Removed from favourites"
        : "Saved to favourites ♥"
    );
  }

  function addToPlanner(recipe) {
    if (mealPlan.includes(recipe.id)) {
      setToast("This recipe is already in your planner");
    } else {
      setMealPlan((items) => [...items, recipe.id]);
      setToast(`${recipe.name} added to your planner`);
    }
  }

  function surpriseMe() {
    if (!recipes.length) {
      setToast("Recipes are still loading. Please try again.");
      return;
    }

    const randomRecipe =
      recipes[Math.floor(Math.random() * recipes.length)];

    setSelectedRecipe(randomRecipe);
  }

  function renderCards(items) {
    return (
      <div className="recipe-grid">
        {items.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            saved={favourites.includes(recipe.id)}
            onSave={toggleFavourite}
            onOpen={setSelectedRecipe}
            onPlan={addToPlanner}
          />
        ))}
      </div>
    );
  }

  function renderFilters() {
    return (
      <>
        <div className="filter-row">
          <label className="search-box">
            <Search size={18} />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search recipes or ingredients"
              placeholder="Search recipes or ingredients..."
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <select
            aria-label="Food type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="All">All food types</option>
            <option value="Veg">Vegetarian</option>
            <option value="Non-Veg">Non-vegetarian</option>
            <option value="Contains egg">Contains egg</option>
          </select>

          <select
            aria-label="Recipe difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="All">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
          </select>

          <select
            aria-label="Maximum cooking time"
            value={maxTime}
            onChange={(e) => setMaxTime(e.target.value)}
          >
            <option value="All">Any cooking time</option>
            <option value="15">15 minutes or less</option>
            <option value="30">30 minutes or less</option>
          </select>

          <select
            aria-label="Sort recipes"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="default">Recommended</option>
            <option value="time">Quickest first</option>
            <option value="name">Name A–Z</option>
          </select>

          <button
            type="button"
            className="outline-button"
            onClick={resetFilters}
            disabled={filtersAreDefault}
          >
            Reset all filters
          </button>
        </div>

        <div className="category-chips">
          {auth.user && (
            <button
              className={myRecipesOnly ? "chip active-chip" : "chip"}
              onClick={() => setMyRecipesOnly((prev) => !prev)}
            >
              <ChefHat size={14} /> My Recipes
            </button>
          )}

          {categories.map((item) => (
            <button
              key={item}
              className={
                category === item && !myRecipesOnly ? "chip active-chip" : "chip"
              }
              onClick={() => {
                setCategory(item);
                setMyRecipesOnly(false);
              }}
            >
              {item === "Healthy" && <Leaf size={14} />}
              {item}
            </button>
          ))}

          <button
            className="chip create-recipe-chip"
            onClick={handleOpenCreateRecipe}
            title="Create a new recipe"
          >
            <Plus size={14} /> Add Recipe
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <button className="brand" onClick={() => goTo("Home")}>
          <span className="brand-icon"><ChefHat /></span>
          <span>
            Taste<span className="accent">Trail</span>
            <small>DISCOVER · COOK · ENJOY</small>
          </span>
        </button>

        <button
          className="mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>

        <nav
          className={
            mobileOpen ? "nav-links nav-open" : "nav-links"
          }
        >
          {["Home", "Explore", "Favourites", "Planner"].map(
            (item) => (
              <button
                key={item}
                className={page === item ? "nav-active" : ""}
                onClick={() => goTo(item)}
              >
                {item === "Favourites" && <Heart size={15} />}

                {item === "Explore"
                  ? "Explore recipes"
                  : item === "Planner"
                    ? "Meal planner"
                    : item}

                {item === "Favourites" && (
                  <b>{favourites.length}</b>
                )}
              </button>
            )
          )}
        </nav>

        <button className="surprise-button" onClick={surpriseMe}>
          <Sparkles size={16} /> Surprise me
        </button>

        {auth.user ? (
          <button
            className="nav-user-btn"
            onClick={() => setAuthModalOpen(true)}
            aria-label={`User profile: ${auth.user.displayName}`}
          >
            <span className="nav-avatar-mini">
              {auth.user.displayName ? auth.user.displayName[0].toUpperCase() : "U"}
            </span>
            <span>{auth.user.displayName}</span>
          </button>
        ) : (
          <button
            className="nav-auth-btn"
            onClick={() => setAuthModalOpen(true)}
            aria-label="Sign in or create account"
          >
            <User size={15} />
            <span>Sign in</span>
          </button>
        )}
      </header>

      {loading && (
        <p className="status-banner" role="status">
          Loading recipes…
        </p>
      )}

      {apiError && (
        <div className="status-banner" role="status">
          {apiError}
          <button
            className="outline-button"
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            Retry connection
          </button>
        </div>
      )}

      {page === "Home" && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> YOUR NEXT FAVOURITE MEAL AWAITS
              </div>

              <h1>
                Good food.<br />
                <em>Great</em> discoveries.
              </h1>

              <p>
                Find recipes you'll fall in love with — from
                quick weekday bites to dishes worth slowing
                down for.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={() => goTo("Explore")}
                >
                  Explore recipes <ArrowRight size={17} />
                </button>

                <button
                  className="text-button"
                  onClick={surpriseMe}
                >
                  <Sparkles size={16} /> Surprise me
                </button>
              </div>

              <div className="social-proof">
                <div className="food-avatars">
                  <span>🍋</span><span>🥑</span><span>🍅</span>
                </div>
                <div>
                  <strong>Made for curious foodies</strong>
                  <small>Fresh inspiration, every day</small>
                </div>
                <span className="stars">★★★★★</span>
              </div>
            </div>

            <div className="hero-art">
              <img
                src={foodImage("photo-1547592180-85f173990554")}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/food-placeholder.svg";
                }}
                alt="Fresh colourful food bowl"
              />

              <div className="floating-note top-note">
                ✦ A little taste of joy
              </div>

              <div className="floating-note bottom-note">
                <span>🥗</span>
                <div>
                  <strong>
                    {recipes.length} handpicked recipes
                  </strong>
                  <small>Ready to be explored</small>
                </div>
              </div>

              <span className="doodle">✳</span>
            </div>

            <a className="scroll-note" href="#popular">
              ↓ &nbsp; SCROLL TO GET INSPIRED
            </a>
          </section>

          <section className="benefits">
            <div>
              <span>◷</span>
              <p>
                <strong>Quick & easy</strong>
                <small>Weeknight-friendly ideas</small>
              </p>
            </div>
            <div>
              <span>♧</span>
              <p>
                <strong>Something for everyone</strong>
                <small>Veg, non-veg and more</small>
              </p>
            </div>
            <div>
              <span>♡</span>
              <p>
                <strong>Your personal collection</strong>
                <small>Save what you love</small>
              </p>
            </div>
          </section>

          <section className="section" id="popular">
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  <span /> THE GOOD STUFF
                </div>
                <h2>
                  A little inspiration<br />
                  for <em>every appetite.</em>
                </h2>
                <p>
                  Handpicked recipes to make your everyday delicious.
                </p>
              </div>

              <button
                className="text-button"
                onClick={() => goTo("Explore")}
              >
                See all recipes <ArrowRight size={16} />
              </button>
            </div>

            {renderCards(recipes.slice(0, 4))}
          </section>

          <section className="promo-banner">
            <span className="banner-icon">✳</span>
            <div>
              <div className="eyebrow">
                YOUR KITCHEN, YOUR RULES
              </div>
              <h2>
                Hungry for something <em>new?</em>
              </h2>
              <p>
                Let a surprise recipe choose your next kitchen adventure.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={surpriseMe}
            >
              Pick a recipe <Sparkles size={16} />
            </button>
          </section>
        </main>
      )}

      {page === "Explore" && (
        <main className="section page-section">
          <div className="page-heading">
            <div className="eyebrow">
              <span /> FIND YOUR NEXT FAVOURITE
            </div>
            <h1>Explore the <em>menu.</em></h1>
            <p>
              Search by dish or ingredient, then follow your cravings.
            </p>
          </div>

          {renderFilters()}

          <p className="result-count">
            {filteredRecipes.length} delicious ideas to explore
          </p>

          {loading ? (
            <p role="status">Loading your recipes…</p>
          ) : filteredRecipes.length ? (
            renderCards(filteredRecipes)
          ) : (
            <EmptyState
              title="No recipes found"
              description="Try another search or clear your filters."
              onBrowse={resetFilters}
            />
          )}
        </main>
      )}

      {page === "Favourites" && (
        <main className="section page-section">
          <div className="page-heading">
            <div className="eyebrow">
              <span /> YOUR PERSONAL COLLECTION
            </div>
            <h1>Things you <em>love.</em></h1>
            <p>Your saved recipes, all together in one place.</p>
          </div>

          {loading ? (
            <p role="status">Loading your recipes…</p>
          ) : filteredRecipes.length ? (
            renderCards(filteredRecipes)
          ) : (
            <EmptyState
              title="Your favourites list is waiting"
              description="Tap the heart on a recipe to save it here."
              onBrowse={() => goTo("Explore")}
            />
          )}
        </main>
      )}

      {page === "Planner" && (
        <main className="section page-section">
          <div className="page-heading">
            <div className="eyebrow">
              <span /> A LITTLE PLAN GOES A LONG WAY
            </div>
            <h1>Your meal <em>planner.</em></h1>
            <p>
              Collect recipes for your next meals.
              Your plan stays in this browser.
            </p>
          </div>

          <Planner
            recipes={recipes}
            mealPlan={mealPlan}
            setMealPlan={setMealPlan}
            onOpen={setSelectedRecipe}
            onBrowse={() => goTo("Explore")}
            notify={setToast}
          />
        </main>
      )}

      <Footer goTo={goTo} />

      <RecipeDetails
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onPlan={addToPlanner}
        onEdit={handleOpenEditRecipe}
        onDelete={handleDeleteRecipe}
        canManage={
          Boolean(
            auth.user &&
              selectedRecipe &&
              (auth.user.role === "admin" ||
                (selectedRecipe.userId &&
                  selectedRecipe.userId === auth.user.id))
          )
        }
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={auth.user}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        notify={setToast}
      />

      <RecipeFormModal
        isOpen={recipeFormOpen}
        onClose={() => setRecipeFormOpen(false)}
        initialRecipe={editingRecipe}
        token={auth.token}
        onSaved={handleRecipeSaved}
        notify={setToast}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}