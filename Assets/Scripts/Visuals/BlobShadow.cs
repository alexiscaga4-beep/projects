using UnityEngine;

/// <summary>
/// Cheap, ultra-fast 'Blob Shadow' decal.
/// Replaces heavy dynamic shadow map passes with a simple dark circular projection beneath the character.
/// </summary>
public class BlobShadow : MonoBehaviour
{
    [Tooltip("Radius of the blob shadow circle.")]
    [SerializeField] private float shadowRadius = 1.2f;

    [Tooltip("Opacity of the dark circle (0.35 = 35%).")]
    [Range(0.1f, 1f)]
    [SerializeField] private float shadowOpacity = 0.38f;

    [Tooltip("Ground layer mask for surface height snapping.")]
    [SerializeField] private LayerMask groundLayer = ~0;

    [Tooltip("Height offset above ground to avoid z-fighting with floor tiles.")]
    [SerializeField] private float groundOffset = 0.04f;

    private Transform shadowQuad;

    private void Start()
    {
        CreateShadowQuad();
    }

    private void CreateShadowQuad()
    {
        GameObject quadObj = GameObject.CreatePrimitive(PrimitiveType.Quad);
        quadObj.name = "BlobShadow_Decal";
        Destroy(quadObj.GetComponent<Collider>()); // No physics collision

        shadowQuad = quadObj.transform;
        shadowQuad.SetParent(transform);
        shadowQuad.localRotation = Quaternion.Euler(90f, 0f, 0f); // Lay flat on ground
        shadowQuad.localScale = new Vector3(shadowRadius * 2f, shadowRadius * 2f, 1f);

        // Simple Unlit transparent material
        Renderer rend = quadObj.GetComponent<Renderer>();
        Shader unlitShader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Transparent");
        Material shadowMat = new Material(unlitShader);
        
        Color shadowColor = new Color(0f, 0f, 0f, shadowOpacity);
        if (shadowMat.HasProperty("_BaseColor")) shadowMat.SetColor("_BaseColor", shadowColor);
        else shadowMat.SetColor("_Color", shadowColor);

        rend.material = shadowMat;
        rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        rend.receiveShadows = false;
    }

    private void LateUpdate()
    {
        if (shadowQuad == null) return;

        // Raycast down to find ground elevation
        if (Physics.Raycast(transform.position + Vector3.up * 1f, Vector3.down, out RaycastHit hit, 15f, groundLayer))
        {
            shadowQuad.position = hit.point + Vector3.up * groundOffset;
        }
        else
        {
            Vector3 pos = transform.position;
            pos.y = groundOffset;
            shadowQuad.position = pos;
        }
    }
}
