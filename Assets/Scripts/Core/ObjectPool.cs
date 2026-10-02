using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// High-performance generic object pool. Prevents runtime memory allocations,
/// eliminates Garbage Collection lag spikes, and recycles active/inactive GameObjects.
/// </summary>
public class ObjectPool<T> where T : Component
{
    private readonly T prefab;
    private readonly Transform poolParent;
    private readonly Queue<T> availablePool = new Queue<T>();
    private readonly HashSet<T> activeObjects = new HashSet<T>();

    public ObjectPool(T prefab, int initialSize, Transform parent = null)
    {
        this.prefab = prefab;
        this.poolParent = parent;

        for (int i = 0; i < initialSize; i++)
        {
            T instance = CreateNewInstance();
            instance.gameObject.SetActive(false);
            availablePool.Enqueue(instance);
        }
    }

    private T CreateNewInstance()
    {
        T instance = Object.Instantiate(prefab, poolParent);
        instance.gameObject.SetActive(false);
        return instance;
    }

    /// <summary>
    /// Retrieves a recycled object from the pool, or creates a new one if exhausted.
    /// </summary>
    public T Get(Vector3 position, Quaternion rotation)
    {
        T obj;
        if (availablePool.Count > 0)
        {
            obj = availablePool.Dequeue();
        }
        else
        {
            obj = CreateNewInstance();
        }

        Transform t = obj.transform;
        t.position = position;
        t.rotation = rotation;
        obj.gameObject.SetActive(true);
        activeObjects.Add(obj);
        return obj;
    }

    /// <summary>
    /// Returns an object to the pool, disabling it and preventing garbage collection overhead.
    /// </summary>
    public void Release(T obj)
    {
        if (obj == null) return;

        if (activeObjects.Remove(obj))
        {
            obj.gameObject.SetActive(false);
            if (poolParent != null)
            {
                obj.transform.SetParent(poolParent);
            }
            availablePool.Enqueue(obj);
        }
    }

    /// <summary>
    /// Clears and disables all active objects (useful on level restart).
    /// </summary>
    public void ReleaseAll()
    {
        foreach (T obj in new List<T>(activeObjects))
        {
            Release(obj);
        }
    }

    public int ActiveCount => activeObjects.Count;
    public int AvailableCount => availablePool.Count;
}
