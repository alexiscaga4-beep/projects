using UnityEngine;
#if UNITY_PIPELINE_URP
using UnityEngine.Rendering.Universal;
#endif

/// <summary>
/// Downgrades 3D graphical fidelity and optimizes rendering performance on low-end machines.
/// Configures internal resolution scaling, disables dynamic shadows, reduces camera draw distance,
/// and turns off heavy post-processing / MSAA.
/// </summary>
public class PerformanceOptimizer : MonoBehaviour
{
    [Header("1. Resolution Scaling (Sharp UI, Lightweight 3D)")]
    [Tooltip("Internal 3D rendering resolution multiplier (0.75 = 75%, 0.5 = 50%). Keeps UI text sharp.")]
    [Range(0.4f, 1.0f)]
    [SerializeField] private float renderScale = 0.75f;

    [Header("2. Shadow & Lighting Optimization")]
    [Tooltip("Disable real-time dynamic shadow maps to save GPU fill rate and draw calls.")]
    [SerializeField] private bool disableDynamicShadows = true;

    [Tooltip("Disable MSAA (Multi-Sample Anti-Aliasing) to eliminate heavy multi-sampling cost.")]
    [SerializeField] private bool disableAntiAliasing = true;

    [Header("3. Camera Draw Distance (Far Clipping Plane)")]
    [Tooltip("Reduce camera far clipping plane from default 1000 down to 75-90.")]
    [SerializeField] private float maxDrawDistance = 85f;

    [Tooltip("Enable matching linear fog to smoothly hide geometry before the clipping plane.")]
    [SerializeField] private bool enableLinearFog = true;
    [SerializeField] private float fogStartDistance = 45f;
    [SerializeField] private float fogEndDistance = 85f;
    [SerializeField] private Color fogColor = new Color(0.05f, 0.07f, 0.11f);

    [Header("4. Target Framerate & VSync")]
    [SerializeField] private int targetFramerate = 60;
    [SerializeField] private int vSyncCount = 0; // 0 = Don't wait for VSync

    private void Awake()
    {
        ApplyPerformanceOptimizations();
    }

    public void ApplyPerformanceOptimizations()
    {
        // 1. Framerate & VSync
        QualitySettings.vSyncCount = vSyncCount;
        Application.targetFrameRate = targetFramerate;

        // 2. Disable Real-Time Shadows
        if (disableDynamicShadows)
        {
            QualitySettings.shadows = ShadowQuality.Disable;
            QualitySettings.shadowDistance = 0f;
        }

        // 3. Disable Anti-Aliasing (MSAA)
        if (disableAntiAliasing)
        {
            QualitySettings.antiAliasing = 0;
        }

        // 4. Reduce Camera Draw Distance & Setup Linear Fog
        Camera cam = Camera.main;
        if (cam != null)
        {
            cam.farClipPlane = maxDrawDistance;
        }

        if (enableLinearFog)
        {
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = fogStartDistance;
            RenderSettings.fogEndDistance = fogEndDistance;
            RenderSettings.fogColor = fogColor;
        }

        // 5. Lower Resolution Scale (Supports URP and Dynamic Resolution)
        ApplyRenderScale(renderScale);
    }

    private void ApplyRenderScale(float scale)
    {
#if UNITY_PIPELINE_URP
        var urpAsset = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
        if (urpAsset != null)
        {
            urpAsset.renderScale = scale;
            urpAsset.msaaSampleCount = 1; // Disabled
        }
#else
        // Fallback for Built-in Pipeline Dynamic Resolution
        if (ScalableBufferManager.widthScaleFactor > 0f)
        {
            ScalableBufferManager.ResizeBuffers(scale, scale);
        }
#endif
    }

    public void SetRenderScale(float scale)
    {
        renderScale = Mathf.Clamp(scale, 0.4f, 1.0f);
        ApplyRenderScale(renderScale);
    }
}
