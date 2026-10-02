using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Handles camera line-of-sight occlusion by shooting raycasts from the camera to the player.
/// When environmental obstacles (such as tree canopies, leaves, or statues) block the view,
/// their materials are smoothly faded to 30% opacity. Once unobstructed, opacity is restored to 100%.
/// </summary>
public class CameraOcclusionFader : MonoBehaviour
{
    [Header("Target Tracking")]
    [Tooltip("Target to keep in view (defaults to GameObject with 'Player' tag).")]
    [SerializeField] private Transform playerTarget;

    [Tooltip("Height offset above player origin to aim raycast at (e.g., chest/head level).")]
    [SerializeField] private float targetHeightOffset = 1.2f;

    [Header("Occlusion Raycast Settings")]
    [Tooltip("Layer mask containing occluding environmental objects (e.g., 'Obstacles' or 'Environment').")]
    [SerializeField] private LayerMask occluderLayers = ~0;

    [Tooltip("Radius of the sphere cast. A small sphere cast ensures reliable canopy detection.")]
    [SerializeField] private float sphereCastRadius = 0.35f;

    [Header("Transparency Settings")]
    [Tooltip("Target opacity when an obstacle is blocking the player (30% = 0.3).")]
    [Range(0.05f, 0.9f)]
    [SerializeField] private float fadedOpacity = 0.3f;

    [Tooltip("Speed at which materials fade between opaque and transparent.")]
    [SerializeField] private float fadeSpeed = 8.0f;

    // Track all renderers that have been modified or are currently fading
    private readonly Dictionary<Renderer, FaderData> trackedFaders = new Dictionary<Renderer, FaderData>();
    private readonly HashSet<Renderer> currentFrameHits = new HashSet<Renderer>();

    private class FaderData
    {
        public Renderer Renderer;
        public Material[] Materials;
        public Color[] OriginalColors;
        public float CurrentAlpha;
        public float TargetAlpha;
        public bool IsURP;
    }

    private void Start()
    {
        if (playerTarget == null)
        {
            GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
            if (playerObj != null)
            {
                playerTarget = playerObj.transform;
            }
        }
    }

    private void LateUpdate()
    {
        if (playerTarget == null) return;

        UpdateOcclusionRaycast();
        ProcessFadeTransitions();
    }

    /// <summary>
    /// Casts from camera position to player chest height to find blocking environmental objects.
    /// </summary>
    private void UpdateOcclusionRaycast()
    {
        currentFrameHits.Clear();

        Vector3 cameraPos = transform.position;
        Vector3 targetPos = playerTarget.position + Vector3.up * targetHeightOffset;
        Vector3 direction = targetPos - cameraPos;
        float distance = direction.magnitude;

        if (distance <= 0.01f) return;

        direction.Normalize();

        // Perform SphereCastAll to detect blocking foliage and geometry
        RaycastHit[] hits = Physics.SphereCastAll(cameraPos, sphereCastRadius, direction, distance - 0.2f, occluderLayers);

        for (int i = 0; i < hits.Length; i++)
        {
            RaycastHit hit = hits[i];
            
            // Skip the player or any non-environment collider
            if (hit.transform.CompareTag("Player") || hit.transform.CompareTag("Enemy"))
            {
                continue;
            }

            Renderer rend = hit.collider.GetComponent<Renderer>();
            if (rend == null)
            {
                rend = hit.collider.GetComponentInParent<Renderer>();
            }

            if (rend != null)
            {
                currentFrameHits.Add(rend);

                if (!trackedFaders.ContainsKey(rend))
                {
                    RegisterRenderer(rend);
                }

                // Set target alpha to faded value (30%)
                trackedFaders[rend].TargetAlpha = fadedOpacity;
            }
        }

        // For renderers no longer occluding, restore target alpha back to 100%
        foreach (var kvp in trackedFaders)
        {
            if (!currentFrameHits.Contains(kvp.Key))
            {
                kvp.Value.TargetAlpha = 1.0f;
            }
        }
    }

    /// <summary>
    /// Smoothly interpolates the alpha of all active faders towards their target alpha.
    /// </summary>
    private void ProcessFadeTransitions()
    {
        List<Renderer> toRemove = null;

        foreach (var kvp in trackedFaders)
        {
            FaderData data = kvp.Value;
            data.CurrentAlpha = Mathf.MoveTowards(data.CurrentAlpha, data.TargetAlpha, fadeSpeed * Time.deltaTime);

            for (int i = 0; i < data.Materials.Length; i++)
            {
                Material mat = data.Materials[i];
                if (mat == null) continue;

                Color c = data.OriginalColors[i];
                c.a = data.CurrentAlpha;

                if (data.IsURP)
                {
                    mat.SetColor("_BaseColor", c);
                }
                else
                {
                    mat.SetColor("_Color", c);
                }
            }

            // If fully restored back to 100%, clean up tracking
            if (data.CurrentAlpha >= 0.999f && data.TargetAlpha >= 0.999f)
            {
                if (toRemove == null) toRemove = new List<Renderer>();
                toRemove.Add(kvp.Key);
            }
        }

        if (toRemove != null)
        {
            for (int i = 0; i < toRemove.Count; i++)
            {
                Renderer rend = toRemove[i];
                if (trackedFaders.TryGetValue(rend, out FaderData data))
                {
                    // Restore original opaque setup
                    for (int j = 0; j < data.Materials.Length; j++)
                    {
                        if (data.Materials[j] != null)
                        {
                            SetMaterialOpaque(data.Materials[j], data.IsURP, data.OriginalColors[j]);
                        }
                    }
                    trackedFaders.Remove(rend);
                }
            }
        }
    }

    /// <summary>
    /// Registers a newly occluding renderer, caching its materials and switching to transparent rendering mode.
    /// </summary>
    private void RegisterRenderer(Renderer rend)
    {
        Material[] mats = rend.materials; // Instantiate local material instances
        Color[] origColors = new Color[mats.Length];
        bool isURP = false;

        for (int i = 0; i < mats.Length; i++)
        {
            Material m = mats[i];
            if (m.HasProperty("_BaseColor"))
            {
                origColors[i] = m.GetColor("_BaseColor");
                isURP = true;
                SetMaterialTransparentURP(m);
            }
            else if (m.HasProperty("_Color"))
            {
                origColors[i] = m.GetColor("_Color");
                SetMaterialTransparentStandard(m);
            }
            else
            {
                origColors[i] = Color.white;
            }
        }

        trackedFaders[rend] = new FaderData
        {
            Renderer = rend,
            Materials = mats,
            OriginalColors = origColors,
            CurrentAlpha = 1.0f,
            TargetAlpha = fadedOpacity,
            IsURP = isURP
        };
    }

    private static void SetMaterialTransparentStandard(Material mat)
    {
        mat.SetFloat("_Mode", 2); // 2 = Fade, 3 = Transparent
        mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
        mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        mat.SetInt("_ZWrite", 0);
        mat.DisableKeyword("_ALPHATEST_ON");
        mat.EnableKeyword("_ALPHABLEND_ON");
        mat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
        mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
    }

    private static void SetMaterialTransparentURP(Material mat)
    {
        mat.SetFloat("_Surface", 1); // 1 = Transparent
        mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
        mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        mat.SetInt("_ZWrite", 0);
        mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
    }

    private static void SetMaterialOpaque(Material mat, bool isURP, Color originalColor)
    {
        if (isURP)
        {
            mat.SetColor("_BaseColor", originalColor);
            mat.SetFloat("_Surface", 0); // 0 = Opaque
            mat.SetInt("_ZWrite", 1);
            mat.DisableKeyword("_SURFACE_TYPE_TRANSPARENT");
            mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Geometry;
        }
        else
        {
            mat.SetColor("_Color", originalColor);
            mat.SetFloat("_Mode", 0); // 0 = Opaque
            mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.One);
            mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.Zero);
            mat.SetInt("_ZWrite", 1);
            mat.DisableKeyword("_ALPHABLEND_ON");
            mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Geometry;
        }
    }
}
