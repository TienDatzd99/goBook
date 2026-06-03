import { createContext, useState, useEffect, useContext } from 'react';

const CategoryContext = createContext();

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, loading }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategories = () => useContext(CategoryContext);
