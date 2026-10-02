using System;
using UnityEngine;

/// <summary>
/// Controls 3D projectile ballistics, collision detection, and pooled recycling.
/// Integrates with ObjectPool to eliminate GC allocation lag.
/// </summary>
public class Projectile : MonoBehaviour
{
    [Header("Ballistics")]
    [SerializeField] private float speed = 26f;
    [SerializeField] private int damage = 30;
    [SerializeField] private float lifespan = 3.0f;

    [Header("Visuals")]
    [SerializeField] private GameObject hitEffectPrefab;

    private Vector3 moveDirection;
    private float lifeTimer;
    private Action<Projectile> returnToPool;

    public void Initialize(Vector3 direction, int? customDamage = null, Action<Projectile> poolCallback = null)
    {
        moveDirection = direction.normalized;
        if (customDamage.HasValue) damage = customDamage.Value;
        returnToPool = poolCallback;

        transform.rotation = Quaternion.LookRotation(moveDirection);
        lifeTimer = lifespan;
    }

    private void Update()
    {
        transform.position += moveDirection * (speed * Time.deltaTime);

        lifeTimer -= Time.deltaTime;
        if (lifeTimer <= 0f)
        {
            Despawn();
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Enemy") || other.gameObject.layer == LayerMask.NameToLayer("Enemy"))
        {
            if (other.TryGetComponent<Enemy>(out var enemy))
            {
                enemy.TakeDamage(damage);
                SpawnHitEffect();
                Despawn();
            }
        }
    }

    private void Despawn()
    {
        if (returnToPool != null)
        {
            returnToPool.Invoke(this);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void SpawnHitEffect()
    {
        if (hitEffectPrefab != null)
        {
            Instantiate(hitEffectPrefab, transform.position, Quaternion.identity);
        }
    }
}
